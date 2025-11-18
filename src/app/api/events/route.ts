import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import Event, { IEvent } from '@/app/lib/models/Event';
import { Types } from 'mongoose';

const EVENTS_PER_PAGE = 12;

interface AggregatedEvent extends IEvent {
  _id: Types.ObjectId;
  relevanceScore?: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('q') || '';
    
    // NEW: Filter parameters
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const dateFilter = searchParams.get('date') || '';
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const freeOnly = searchParams.get('free') === 'true';
    
    const skip = (page - 1) * EVENTS_PER_PAGE;

    // Build base match conditions
    const matchConditions: any = {
      startDate: { $gte: new Date() }
    };

    // Category filter
    if (category) {
      matchConditions.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Subcategory filter
    if (subcategory) {
      matchConditions.subcategory = { $regex: new RegExp(`^${subcategory}$`, 'i') };
    }

    // Date range filter
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          matchConditions.startDate = { $gte: today, $lt: tomorrow };
          break;
          
        case 'this-week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          matchConditions.startDate = { $gte: today, $lt: weekEnd };
          break;
          
        case 'this-month':
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          matchConditions.startDate = { $gte: today, $lt: monthEnd };
          break;
      }
    }

    // Price filters
    if (freeOnly) {
      matchConditions.isFree = true;
    } else {
      if (priceMin) {
        matchConditions.priceMin = { $gte: parseInt(priceMin) };
      }
      if (priceMax) {
        matchConditions.priceMax = { $lte: parseInt(priceMax) };
      }
    }

    // Search query conditions
    if (searchQuery.trim()) {
      const normalisedQuery = searchQuery.trim().toLowerCase();
      matchConditions.$or = [
        { category: { $regex: normalisedQuery, $options: 'i' } },
        { subcategory: { $regex: normalisedQuery, $options: 'i' } },
        { title: { $regex: normalisedQuery, $options: 'i' } },
        { description: { $regex: normalisedQuery, $options: 'i' } },
        { 'venue.name': { $regex: normalisedQuery, $options: 'i' } },
      ];
    }

    // Simple query (no search)
    if (!searchQuery.trim()) {
      const [events, totalEvents] = await Promise.all([
        Event.find(matchConditions)
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(EVENTS_PER_PAGE)
          .lean(),
        Event.countDocuments(matchConditions),
      ]);

      const serializedEvents = events.map((event) => ({
        _id: event._id.toString(),
        title: event.title,
        description: event.description,
        category: event.category,
        subcategory: event.subcategory,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString(),
        venue: event.venue,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        isFree: event.isFree,
        bookingUrl: event.bookingUrl,
        imageUrl: event.imageUrl,
        source: event.source,
        sourceId: event.sourceId,
        scrapedAt: event.scrapedAt.toISOString(),
        lastUpdated: event.lastUpdated.toISOString(),
      }));

      return NextResponse.json({
        events: serializedEvents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEvents / EVENTS_PER_PAGE),
          totalEvents,
          hasMore: page < Math.ceil(totalEvents / EVENTS_PER_PAGE),
        },
      });
    }

    // Advanced search with relevance scoring
    const normalisedQuery = searchQuery.trim().toLowerCase();
    
    const pipeline = [
      { $match: matchConditions },
      {
        $addFields: {
          relevanceScore: {
            $sum: [
              { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: `^${normalisedQuery}$` } }, 100, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: { $ifNull: ['$subcategory', ''] } }, regex: `^${normalisedQuery}$` } }, 100, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: normalisedQuery } }, 50, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: { $ifNull: ['$subcategory', ''] } }, regex: normalisedQuery } }, 50, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: `^${normalisedQuery}` } }, 40, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: normalisedQuery } }, 20, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: '$venue.name' }, regex: normalisedQuery } }, 10, 0] },
              { $cond: [{ $regexMatch: { input: { $toLower: '$description' }, regex: normalisedQuery } }, 5, 0] },
            ],
          },
        },
      },
      {
        $sort: {
          relevanceScore: -1 as const,
          startDate: 1 as const
        },
      },
      {
        $facet: {
          events: [
            { $skip: skip },
            { $limit: EVENTS_PER_PAGE },
          ],
          totalCount: [
            { $count: 'count' },
          ],
        },
      },
    ];

    const results = await Event.aggregate(pipeline);

    const events: AggregatedEvent[] = results[0]?.events || [];
    const totalEvents = results[0]?.totalCount[0]?.count || 0;

    const serializedEvents = events.map((event: AggregatedEvent) => ({
      _id: event._id.toString(),
      title: event.title,
      description: event.description,
      category: event.category,
      subcategory: event.subcategory,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      venue: event.venue,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      isFree: event.isFree,
      bookingUrl: event.bookingUrl,
      imageUrl: event.imageUrl,
      source: event.source,
      sourceId: event.sourceId,
      scrapedAt: event.scrapedAt.toISOString(),
      lastUpdated: event.lastUpdated.toISOString(),
    }));

    const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE);

    return NextResponse.json({
      events: serializedEvents,
      pagination: {
        currentPage: page,
        totalPages,
        totalEvents,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
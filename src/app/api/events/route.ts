
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Types, FilterQuery } from 'mongoose';
import { Event, type IEvent } from '@/lib/models';

const EVENTS_PER_PAGE = 18;

interface AggregatedEvent extends IEvent {
  _id: Types.ObjectId;
  relevanceScore?: number;
}

/**
 * GET /api/events
 * Retrieves paginated events with optional filtering and search.
 * 
 * Query params:
 * - page: page number (default: 1)
 * - q: search query
 * - category: filter by category
 * - subcategory: filter by subcategory
 * - date: filter by date range (today, this-week, this-month, next-month)
 * - priceMin/priceMax: price range filters
 * - free: show only free events
 * - accessible: show only accessible events
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('q') || '';

    const matchConditions = buildMatchConditions(searchParams);

    // Simple query without search
    if (!searchQuery.trim()) {
      return await fetchSimpleEvents(matchConditions, page);
    }

    // Advanced search with relevance scoring
    return await fetchSearchResults(matchConditions, searchQuery, page);
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

/**
 * Builds MongoDB match conditions from query parameters.
 */
function buildMatchConditions(searchParams: URLSearchParams): FilterQuery<IEvent> {
  const matchConditions: FilterQuery<IEvent> = {
    startDate: { $gte: new Date() }
  };

  // Category filter (case-insensitive)
  const category = searchParams.get('category');
  if (category) {
    matchConditions.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }

  // Subcategory filter
  const subcategory = searchParams.get('subcategory');
  if (subcategory) {
    matchConditions.subcategories = {
      $elemMatch: { $regex: new RegExp(`^${subcategory}$`, 'i') }
    };
  }

  // Date range filter
  const dateFilter = searchParams.get('date');
  if (dateFilter) {
    applyDateFilter(matchConditions, dateFilter);
  }

  // Price filters
  const freeOnly = searchParams.get('free') === 'true';
  if (freeOnly) {
    matchConditions.isFree = true;
  } else {
    applyPriceFilters(matchConditions, searchParams);
  }

  // Accessibility filter
  const accessibleOnly = searchParams.get('accessible') === 'true';
  if (accessibleOnly) {
    matchConditions.$and = matchConditions.$and || [];
    matchConditions.$and.push({
      accessibility: {
        $exists: true,
        $ne: null,
        $not: { $size: 0 }
      }
    });
  }

  return matchConditions;
}

/**
 * Applies date range filter to match conditions.
 */
function applyDateFilter(matchConditions: FilterQuery<IEvent>, dateFilter: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilter) {
    case 'today': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchConditions.startDate = { $gte: today, $lt: tomorrow };
      break;
    }
    case 'this-week': {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      matchConditions.startDate = { $gte: today, $lt: weekEnd };
      break;
    }
    case 'this-month': {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      matchConditions.startDate = { $gte: today, $lt: monthEnd };
      break;
    }
    case 'next-month': {
      const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 1);
      matchConditions.startDate = { $gte: nextMonthStart, $lt: nextMonthEnd };
      break;
    }
  }
}

/**
 * Applies price range filters to match conditions.
 */
function applyPriceFilters(matchConditions: FilterQuery<IEvent>, searchParams: URLSearchParams) {
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');

  if (priceMin) {
    matchConditions.priceMin = { $gte: parseInt(priceMin) };
  }
  if (priceMax) {
    matchConditions.priceMax = { $lte: parseInt(priceMax) };
  }
}

/**
 * Fetches events without search (simple query with sorting).
 */
async function fetchSimpleEvents(matchConditions: FilterQuery<IEvent>, page: number) {
  const skip = (page - 1) * EVENTS_PER_PAGE;

  const [events, totalEvents] = await Promise.all([
    Event.find(matchConditions)
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(EVENTS_PER_PAGE)
      .lean(),
    Event.countDocuments(matchConditions),
  ]);

  return NextResponse.json({
    events: events.map(serialiseEvent),
    pagination: buildPagination(page, totalEvents),
  });
}

/**
 * Fetches search results with relevance scoring.
 * 
 * Relevance scoring algorithm:
 * - Exact category match: 100 points
 * - Partial category match: 50 points
 * - Title starts with query: 40 points
 * - Title contains query: 20 points
 * - Venue contains query: 10 points
 * - Description contains query: 5 points
 */
async function fetchSearchResults(
  matchConditions: FilterQuery<IEvent>,
  searchQuery: string,
  page: number
) {
  const skip = (page - 1) * EVENTS_PER_PAGE;
  const normalisedQuery = searchQuery.trim().toLowerCase();

  // Add search conditions
  matchConditions.$or = [
    { category: { $regex: normalisedQuery, $options: 'i' } },
    { subcategories: { $elemMatch: { $regex: normalisedQuery, $options: 'i' } } },
    { title: { $regex: normalisedQuery, $options: 'i' } },
    { description: { $regex: normalisedQuery, $options: 'i' } },
    { 'venue.name': { $regex: normalisedQuery, $options: 'i' } },
  ];

  const pipeline = [
    { $match: matchConditions },
    {
      $addFields: {
        relevanceScore: {
          $sum: [
            { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: `^${normalisedQuery}$` } }, 100, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: normalisedQuery } }, 50, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: `^${normalisedQuery}` } }, 40, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: normalisedQuery } }, 20, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$venue.name' }, regex: normalisedQuery } }, 10, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$description' }, regex: normalisedQuery } }, 5, 0] },
          ],
        },
      },
    },
    { $sort: { relevanceScore: -1 as const, startDate: 1 as const } },
    {
      $facet: {
        events: [{ $skip: skip }, { $limit: EVENTS_PER_PAGE }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const results = await Event.aggregate(pipeline);
  const events: AggregatedEvent[] = results[0]?.events || [];
  const totalEvents = results[0]?.totalCount[0]?.count || 0;

  return NextResponse.json({
    events: events.map(serialiseEvent),
    pagination: buildPagination(page, totalEvents),
  });
}

/** Serialises an event for API response. */
function serialiseEvent(event: any) {
  return {
    _id: event._id.toString(),
    title: event.title,
    description: event.description,
    category: event.category,
    subcategories: event.subcategories,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString(),
    venue: event.venue,
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    isFree: event.isFree,
    bookingUrl: event.bookingUrl,
    bookingUrls: event.bookingUrls,
    imageUrl: event.imageUrl,
    accessibility: event.accessibility,
    duration: event.duration,
    ageRestriction: event.ageRestriction,
    sources: event.sources,
    sourceIds: event.sourceIds,
    primarySource: event.primarySource,
    scrapedAt: event.scrapedAt.toISOString(),
    lastUpdated: event.lastUpdated.toISOString(),
  };
}

/** Builds pagination metadata. */
function buildPagination(page: number, totalEvents: number) {
  const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE);

  return {
    currentPage: page,
    totalPages,
    totalEvents,
    hasMore: page < totalPages,
  };
}

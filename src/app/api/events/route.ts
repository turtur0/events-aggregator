import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Types, FilterQuery } from 'mongoose';
import { Event, type IEvent } from '@/lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPersonalisedRecommendations } from '@/lib/ml/user-profile-service';
import { serialiseEvent, type EventResponse } from '@/lib/transformers/event-transformer';

const EVENTS_PER_PAGE = 18;

type SortOption =
  | 'recommended'
  | 'popular'
  | 'price-low'
  | 'price-high'
  | 'date-soon'
  | 'date-late'
  | 'recently-added';

interface EventsApiResponse {
  events: EventResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalEvents: number;
    hasMore: boolean;
  };
}

/**
 * GET /api/events
 * Returns filtered, sorted, and paginated events.
 *
 * Query params:
 * - page: page number (default: 1)
 * - q: search query
 * - sort: sort option
 * - category, subcategory, date filters, price filters, etc.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('q') || '';
    const sortOption = (searchParams.get('sort') as SortOption) || null;

    const session = await getServerSession(authOptions);
    const matchConditions = buildMatchConditions(searchParams);

    // Handle personalised recommendations
    if (sortOption === 'recommended' && session?.user?.id) {
      return await fetchRecommendedEvents(
        matchConditions,
        page,
        new Types.ObjectId(session.user.id)
      );
    }

    // Handle search with relevance
    if (searchQuery.trim()) {
      return await fetchSearchResults(
        matchConditions,
        searchQuery,
        page,
        sortOption || 'date-soon'
      );
    }

    // Handle standard sorted queries
    return await fetchSortedEvents(matchConditions, page, sortOption || 'date-soon');
  } catch (error) {
    console.error('[Events API] Error:', error);
    return createErrorResponse('Failed to fetch events', 500);
  }
}

/**
 * Builds MongoDB match conditions from query params
 */
function buildMatchConditions(searchParams: URLSearchParams): FilterQuery<IEvent> {
  const now = new Date();

  const matchConditions: FilterQuery<IEvent> = {
    $or: [
      { endDate: { $gte: now } },
      { endDate: { $exists: false }, startDate: { $gte: now } },
      { endDate: null, startDate: { $gte: now } },
    ],
    isArchived: { $ne: true },
  };

  // Category filter
  const category = searchParams.get('category');
  if (category && category !== 'all') {
    matchConditions.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }

  // Subcategory filter
  const subcategory = searchParams.get('subcategory');
  if (subcategory && subcategory !== 'all') {
    matchConditions.subcategories = {
      $elemMatch: { $regex: new RegExp(`^${subcategory}$`, 'i') },
    };
  }

  // Date range filters
  const dateFilter = searchParams.get('date');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (dateFrom || dateTo) {
    applyCustomDateRange(matchConditions, dateFrom || undefined, dateTo || undefined, now);
  } else if (dateFilter && dateFilter !== 'all') {
    applyDateFilter(matchConditions, dateFilter, now);
  }

  // Price filters
  const freeOnly = searchParams.get('free') === 'true';
  if (freeOnly) {
    matchConditions.isFree = true;
  } else {
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin) matchConditions.priceMin = { $gte: parseInt(priceMin) };
    if (priceMax) matchConditions.priceMax = { $lte: parseInt(priceMax) };
  }

  // Accessibility filter
  if (searchParams.get('accessible') === 'true') {
    matchConditions.accessibility = {
      $exists: true,
      $ne: null,
      $not: { $size: 0 },
    } as any;
  }

  return matchConditions;
}

/**
 * Applies preset date filters (today, this-week, etc.)
 */
function applyDateFilter(matchConditions: FilterQuery<IEvent>, dateFilter: string, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filters: Record<string, [Date, Date]> = {
    today: [today, new Date(today.getTime() + 86400000)],
    'this-week': [today, new Date(today.getTime() + 7 * 86400000)],
    'this-month': [today, new Date(today.getFullYear(), today.getMonth() + 1, 1)],
    'next-month': [
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      new Date(today.getFullYear(), today.getMonth() + 2, 1),
    ],
  };

  const [start, end] = filters[dateFilter] || [today, null];
  if (end) {
    matchConditions.startDate = { $gte: start, $lt: end };
  }
}

/**
 * Applies custom date range filters
 */
function applyCustomDateRange(
  matchConditions: FilterQuery<IEvent>,
  dateFrom?: string,
  dateTo?: string,
  now?: Date
) {
  if (!dateFrom && !dateTo) return;

  const today = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date();
  const dateConditions: any = {};

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    dateConditions.$gte = fromDate >= today ? fromDate : today;
  } else {
    dateConditions.$gte = today;
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setDate(toDate.getDate() + 1);
    toDate.setHours(0, 0, 0, 0);
    dateConditions.$lt = toDate;
  }

  matchConditions.startDate = dateConditions;
}

/**
 * Returns sort configuration for MongoDB
 */
function getSortConfig(sortOption: SortOption): Record<string, 1 | -1> {
  const configs: Record<SortOption, Record<string, 1 | -1>> = {
    popular: { 'stats.categoryPopularityPercentile': -1, startDate: 1 },
    'price-low': { priceMin: 1, startDate: 1 },
    'price-high': { priceMax: -1, startDate: 1 },
    'date-soon': { startDate: 1 },
    'date-late': { startDate: -1 },
    'recently-added': { scrapedAt: -1, startDate: 1 },
    recommended: { startDate: 1 },
  };

  return configs[sortOption] || configs['date-soon'];
}

/**
 * Fetches personalised recommended events
 */
async function fetchRecommendedEvents(
  matchConditions: FilterQuery<IEvent>,
  page: number,
  userId: Types.ObjectId
) {
  try {
    const User = (await import('@/lib/models/User')).default;
    const user = await User.findById(userId);

    if (!user) {
      return fetchSortedEvents(matchConditions, page, 'date-soon');
    }

    const recommendations = await getPersonalisedRecommendations(userId, user, {
      limit: EVENTS_PER_PAGE * 5,
      excludeFavourited: false,
      category: matchConditions.category?.$regex?.source,
      minDate: matchConditions.startDate?.$gte as Date,
    });

    let filteredEvents = recommendations
      .map(r => r.event)
      .filter(event => !event.isArchived && isEventValid(event, matchConditions));

    // Paginate
    const skip = (page - 1) * EVENTS_PER_PAGE;
    const paginatedEvents = filteredEvents.slice(skip, skip + EVENTS_PER_PAGE);

    return createSuccessResponse(
      paginatedEvents.map(serialiseEvent),
      page,
      filteredEvents.length
    );
  } catch (error) {
    console.error('[Events API] Recommendation error:', error);
    return fetchSortedEvents(matchConditions, page, 'date-soon');
  }
}

/**
 * Checks if event matches filter conditions
 */
function isEventValid(event: any, conditions: FilterQuery<IEvent>): boolean {
  const now = new Date();

  // Date validity
  if (event.endDate) {
    if (new Date(event.endDate) < now) return false;
  } else if (new Date(event.startDate) < now) {
    return false;
  }

  // Subcategory filter
  if (conditions.subcategories?.$elemMatch) {
    const regex = conditions.subcategories.$elemMatch.$regex;
    if (regex && !event.subcategories?.some((sub: string) => regex.test(sub))) {
      return false;
    }
  }

  // Date range filter
  if (conditions.startDate) {
    const eventDate = new Date(event.startDate);
    if (conditions.startDate.$gte && eventDate < conditions.startDate.$gte) return false;
    if (conditions.startDate.$lt && eventDate >= conditions.startDate.$lt) return false;
  }

  // Free filter
  if (conditions.isFree === true && event.isFree !== true) return false;

  // Accessibility filter
  if (conditions.accessibility && (!event.accessibility || event.accessibility.length === 0)) {
    return false;
  }

  return true;
}

/**
 * Fetches sorted events without search
 */
async function fetchSortedEvents(
  matchConditions: FilterQuery<IEvent>,
  page: number,
  sortOption: SortOption
) {
  const skip = (page - 1) * EVENTS_PER_PAGE;
  const sortConfig = getSortConfig(sortOption);

  const [events, totalEvents] = await Promise.all([
    Event.find(matchConditions).sort(sortConfig).skip(skip).limit(EVENTS_PER_PAGE).lean(),
    Event.countDocuments(matchConditions),
  ]);

  return createSuccessResponse(events.map(serialiseEvent), page, totalEvents);
}

/**
 * Fetches search results with relevance scoring
 */
async function fetchSearchResults(
  matchConditions: FilterQuery<IEvent>,
  searchQuery: string,
  page: number,
  sortOption: SortOption
) {
  const skip = (page - 1) * EVENTS_PER_PAGE;
  const escapedQuery = searchQuery.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const searchConditions: FilterQuery<IEvent> = {
    ...matchConditions,
    $or: [
      { title: { $regex: escapedQuery, $options: 'i' } },
      { description: { $regex: escapedQuery, $options: 'i' } },
      { 'venue.name': { $regex: escapedQuery, $options: 'i' } },
      { category: { $regex: escapedQuery, $options: 'i' } },
      { subcategories: { $elemMatch: { $regex: escapedQuery, $options: 'i' } } },
    ],
  };

  // Build sort config with relevance
  const baseSortConfigs: Record<string, Record<string, 1 | -1>> = {
    popular: { 'stats.categoryPopularityPercentile': -1, startDate: 1 },
    'price-low': { priceMin: 1, startDate: 1 },
    'price-high': { priceMax: -1, startDate: 1 },
    'date-late': { startDate: -1 },
    'recently-added': { scrapedAt: -1 },
  };

  const finalSort: Record<string, 1 | -1> = {
    relevanceScore: -1 as const,
    ...(baseSortConfigs[sortOption] || { startDate: 1 as const }),
  };

  const pipeline = [
    { $match: searchConditions },
    {
      $addFields: {
        relevanceScore: {
          $sum: [
            { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: `^${escapedQuery}$` } }, 100, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$category' }, regex: escapedQuery } }, 50, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: `^${escapedQuery}` } }, 40, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: escapedQuery } }, 20, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$venue.name' }, regex: escapedQuery } }, 10, 0] },
            { $cond: [{ $regexMatch: { input: { $toLower: '$description' }, regex: escapedQuery } }, 5, 0] },
          ],
        },
      },
    },
    { $sort: finalSort },
    {
      $facet: {
        events: [{ $skip: skip }, { $limit: EVENTS_PER_PAGE }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const results = await Event.aggregate(pipeline);
  const events = results[0]?.events || [];
  const totalEvents = results[0]?.totalCount[0]?.count || 0;

  return createSuccessResponse(events.map(serialiseEvent), page, totalEvents);
}

/**
 * Creates success response with pagination
 */
function createSuccessResponse(
  events: EventResponse[],
  page: number,
  totalEvents: number
): NextResponse<EventsApiResponse> {
  const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE);

  return NextResponse.json({
    events,
    pagination: {
      currentPage: page,
      totalPages,
      totalEvents,
      hasMore: page < totalPages,
    },
  });
}

/**
 * Creates error response
 */
function createErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
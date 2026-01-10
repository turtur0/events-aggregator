import { connectDB } from '@/lib/db';
import { Event, type IEvent } from '@/lib/models';
import { transformEvent, type EventResponse } from '@/lib/transformers/event-transformer';
import { FilterQuery, Types } from 'mongoose';

// ============================================
// TYPES
// ============================================

export type SortOption =
  | 'recommended'
  | 'popular'
  | 'price-low'
  | 'price-high'
  | 'date-soon'
  | 'date-late'
  | 'recently-added';

export interface EventFilters {
    searchQuery?: string;
    category?: string;
    subcategory?: string;
    dateFilter?: 'today' | 'this-week' | 'this-month' | 'next-month' | 'custom';
    dateFrom?: string;
    dateTo?: string;
    freeOnly?: boolean;
    priceMin?: number;
    priceMax?: number;
    accessibleOnly?: boolean;
    isArchived?: boolean;
}

export interface PaginationOptions {
    page?: number;
    pageSize?: number;
}

export interface PaginatedEvents {
    events: EventResponse[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalEvents: number;
        hasMore: boolean;
    };
}

// ============================================
// QUERY BUILDER
// ============================================

function buildBaseQuery(filters: EventFilters): FilterQuery<IEvent> {
    const now = new Date();
    const query: FilterQuery<IEvent> = {};

    // Archive vs Active events
    if (filters.isArchived) {
        query.$or = [
            { isArchived: true },
            { endDate: { $lt: now } }
        ];
    } else {
        query.$or = [
            { endDate: { $gte: now } },
            { endDate: { $exists: false }, startDate: { $gte: now } },
            { endDate: null, startDate: { $gte: now } },
        ];
        query.isArchived = { $ne: true };
    }

    // Category filters
    if (filters.category && filters.category !== 'all') {
        query.category = { $regex: new RegExp(`^${filters.category}$`, 'i') };
    }

    if (filters.subcategory && filters.subcategory !== 'all') {
        query.subcategories = {
            $elemMatch: { $regex: new RegExp(`^${filters.subcategory}$`, 'i') }
        };
    }

    // Date filters
    if (filters.dateFrom || filters.dateTo) {
        applyCustomDateRange(query, filters.dateFrom, filters.dateTo, now);
    } else if (filters.dateFilter && filters.dateFilter !== 'custom') {
        applyPresetDateFilter(query, filters.dateFilter, now);
    }

    // Price filters
    if (filters.freeOnly) {
        query.isFree = true;
    } else {
        if (filters.priceMin !== undefined) {
            query.priceMin = { $gte: filters.priceMin };
        }
        if (filters.priceMax !== undefined) {
            query.priceMax = { $lte: filters.priceMax };
        }
    }

    // Accessibility filter
    if (filters.accessibleOnly) {
        query.accessibility = {
            $exists: true,
            $ne: null,
            $not: { $size: 0 },
        } as any;
    }

    return query;
}

function applyPresetDateFilter(query: FilterQuery<IEvent>, dateFilter: string, now: Date) {
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
        query.startDate = { $gte: start, $lt: end };
    }
}

function applyCustomDateRange(
    query: FilterQuery<IEvent>,
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

    query.startDate = dateConditions;
}

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

// ============================================
// SEARCH HELPERS
// ============================================

function buildSearchQuery(baseQuery: FilterQuery<IEvent>, searchQuery: string): FilterQuery<IEvent> {
    const escapedQuery = searchQuery.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return {
        ...baseQuery,
        $or: [
            { title: { $regex: escapedQuery, $options: 'i' } },
            { description: { $regex: escapedQuery, $options: 'i' } },
            { 'venue.name': { $regex: escapedQuery, $options: 'i' } },
            { category: { $regex: escapedQuery, $options: 'i' } },
            { subcategories: { $elemMatch: { $regex: escapedQuery, $options: 'i' } } },
        ],
    };
}

async function executeSearchWithRelevance(
    searchQuery: FilterQuery<IEvent>,
    escapedQuery: string,
    sortOption: SortOption,
    page: number,
    pageSize: number
): Promise<{ events: any[]; totalEvents: number }> {
    const skip = (page - 1) * pageSize;

    // Build sort with relevance
    const baseSortConfigs: Record<string, Record<string, 1 | -1>> = {
        popular: { 'stats.categoryPopularityPercentile': -1, startDate: 1 },
        'price-low': { priceMin: 1, startDate: 1 },
        'price-high': { priceMax: -1, startDate: 1 },
        'date-late': { startDate: -1 },
        'recently-added': { scrapedAt: -1 },
    };

    const finalSort: Record<string, 1 | -1> = {
        relevanceScore: -1,
        ...(baseSortConfigs[sortOption] || { startDate: 1 }),
    };

    const pipeline = [
        { $match: searchQuery },
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
                events: [{ $skip: skip }, { $limit: pageSize }],
                totalCount: [{ $count: 'count' }],
            },
        },
    ];

    const results = await Event.aggregate(pipeline);
    const events = results[0]?.events || [];
    const totalEvents = results[0]?.totalCount[0]?.count || 0;

    return { events, totalEvents };
}

// ============================================
// RECOMMENDATION HELPERS
// ============================================

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

// ============================================
// PUBLIC API
// ============================================

/**
 * Main method: Get events with filters, search, and sorting
 */
export async function getEvents(
    filters: EventFilters = {},
    sortOption: SortOption = 'date-soon',
    paginationOptions: PaginationOptions = {}
): Promise<PaginatedEvents> {
    await connectDB();

    const { page = 1, pageSize = 18 } = paginationOptions;
    const baseQuery = buildBaseQuery(filters);

    // Handle search
    if (filters.searchQuery?.trim()) {
        return await searchEvents(filters, sortOption, paginationOptions);
    }

    // Standard query
    const skip = (page - 1) * pageSize;
    const sortConfig = getSortConfig(sortOption);

    const [events, totalEvents] = await Promise.all([
        Event.find(baseQuery)
            .sort(sortConfig)
            .skip(skip)
            .limit(pageSize)
            .lean(),
        Event.countDocuments(baseQuery)
    ]);

    const totalPages = Math.ceil(totalEvents / pageSize);

    return {
        events: events.map(transformEvent),
        pagination: {
            currentPage: page,
            totalPages,
            totalEvents,
            hasMore: page < totalPages,
        }
    };
}

/**
 * Search events with relevance scoring
 */
export async function searchEvents(
    filters: EventFilters,
    sortOption: SortOption = 'date-soon',
    paginationOptions: PaginationOptions = {}
): Promise<PaginatedEvents> {
    await connectDB();

    const { page = 1, pageSize = 18 } = paginationOptions;
    const baseQuery = buildBaseQuery(filters);
    const searchQuery = buildSearchQuery(baseQuery, filters.searchQuery!);
    const escapedQuery = filters.searchQuery!.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const { events, totalEvents } = await executeSearchWithRelevance(
        searchQuery,
        escapedQuery,
        sortOption,
        page,
        pageSize
    );

    const totalPages = Math.ceil(totalEvents / pageSize);

    return {
        events: events.map(transformEvent),
        pagination: {
            currentPage: page,
            totalPages,
            totalEvents,
            hasMore: page < totalPages,
        }
    };
}

/**
 * Get personalized recommendations for a user
 */
export async function getRecommendedEvents(
    userId: Types.ObjectId | string,
    filters: EventFilters = {},
    paginationOptions: PaginationOptions = {}
): Promise<PaginatedEvents> {
    await connectDB();

    const { page = 1, pageSize = 18 } = paginationOptions;

    try {
        // Import ML service
        const { getPersonalisedRecommendations } = await import('@/lib/ml/user-profile-service');
        const User = (await import('@/lib/models/User')).default;

        const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        const user = await User.findById(userObjectId);

        if (!user) {
            // Fallback to standard events
            return getEvents(filters, 'date-soon', paginationOptions);
        }

        const baseQuery = buildBaseQuery(filters);

        // Get recommendations from ML service
        const recommendations = await getPersonalisedRecommendations(userObjectId, user, {
            limit: pageSize * 5, // Get more for filtering
            excludeFavourited: false,
            category: filters.category,
            minDate: baseQuery.startDate?.$gte as Date,
        });

        // Filter recommendations based on other criteria
        const filteredEvents = recommendations
            .map(r => r.event)
            .filter(event => !event.isArchived && isEventValid(event, baseQuery));

        // Paginate
        const skip = (page - 1) * pageSize;
        const paginatedEvents = filteredEvents.slice(skip, skip + pageSize);
        const totalEvents = filteredEvents.length;
        const totalPages = Math.ceil(totalEvents / pageSize);

        return {
            events: paginatedEvents.map(transformEvent),
            pagination: {
                currentPage: page,
                totalPages,
                totalEvents,
                hasMore: page < totalPages,
            }
        };
    } catch (error) {
        console.error('[EventService] Recommendation error:', error);
        // Fallback to standard events
        return getEvents(filters, 'date-soon', paginationOptions);
    }
}

/**
 * Get a single event by ID
 */
export async function getEventById(id: string): Promise<EventResponse | null> {
    await connectDB();

    const event = await Event.findById(id).lean();
    if (!event) return null;

    return transformEvent(event);
}

/**
 * Get events by IDs
 */
export async function getEventsByIds(ids: string[]): Promise<EventResponse[]> {
    await connectDB();

    const events = await Event.find({ _id: { $in: ids } }).lean();
    return events.map(transformEvent);
}
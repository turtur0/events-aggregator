import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getTrendingEvents, getUndiscoveredGems } from '@/lib/ml';
import { transformEvent, type EventResponse } from '@/lib/transformers/event-transformer';

type EventType = 'trending' | 'undiscovered';

interface TrendingApiResponse {
    events: EventResponse[];
    count: number;
    type: EventType;
}

/**
 * GET /api/recommendations/trending
 * Returns events based on type: trending or undiscovered gems.
 *
 * Query params:
 * - type: 'trending' | 'undiscovered' (default: 'trending')
 * - limit: number of events (default: 12)
 * - category: filter by category
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const options = parseQueryParams(req);
        const events = await fetchEventsByType(options.type, {
            limit: options.limit,
            category: options.category,
        });

        const transformedEvents = events.map(transformEvent);

        return createSuccessResponse(transformedEvents, options.type);
    } catch (error) {
        console.error('[Trending API] Error:', error);
        return createErrorResponse('Failed to get events', 500);
    }
}

/**
 * Parses and validates query parameters
 */
function parseQueryParams(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    return {
        limit: parseInt(searchParams.get('limit') || '12'),
        category: searchParams.get('category') || undefined,
        type: (searchParams.get('type') || 'trending') as EventType,
    };
}

/**
 * Fetches events based on the specified type
 */
async function fetchEventsByType(
    type: EventType,
    options: { limit: number; category?: string }
) {
    switch (type) {
        case 'trending':
            return getTrendingEvents(options);
        case 'undiscovered':
            return getUndiscoveredGems(options);
        default:
            throw new Error(`Invalid type: ${type}`);
    }
}

/**
 * Creates success response
 */
function createSuccessResponse(
    events: EventResponse[],
    type: EventType
): NextResponse<TrendingApiResponse> {
    return NextResponse.json({
        events,
        count: events.length,
        type,
    });
}

/**
 * Creates error response with appropriate status code
 */
function createErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
}
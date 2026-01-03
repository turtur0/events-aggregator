import { NextRequest, NextResponse } from 'next/server';
import { getSimilarEvents } from '@/lib/ml';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { transformEvent, type EventResponse } from '@/lib/transformers/event-transformer';

interface SimilarEventResponse extends EventResponse {
    similarity: number;
}

interface SimilarEventsApiResponse {
    similarEvents: SimilarEventResponse[];
    count: number;
}

/**
 * GET /api/recommendations/similar/[eventId]
 * Returns events similar to the specified event.
 *
 * Query params:
 * - limit: number of events (default: 6)
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    try {
        await connectDB();

        const { eventId } = await context.params;

        // Validate event ID format
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return createErrorResponse('Invalid event ID', 400);
        }

        const limit = parseLimit(req);

        const similarEvents = await getSimilarEvents(
            new mongoose.Types.ObjectId(eventId),
            { limit }
        );

        // Handle empty results
        if (!similarEvents?.length) {
            return createSuccessResponse([]);
        }

        const transformedEvents = transformSimilarEvents(similarEvents);

        return createSuccessResponse(transformedEvents);
    } catch (error) {
        console.error('[Similar Events API] Error:', error);
        return createErrorResponse('Failed to get similar events', 500);
    }
}

/**
 * Parses limit from query params
 */
function parseLimit(req: NextRequest): number {
    const { searchParams } = new URL(req.url);
    return parseInt(searchParams.get('limit') || '6');
}

/**
 * Transforms similar events with similarity scores
 */
function transformSimilarEvents(
    events: Array<{ event: any; similarity: number }>
): SimilarEventResponse[] {
    return events.map(({ event, similarity }) => ({
        ...transformEvent(event),
        similarity: Math.round(similarity * 100),
    }));
}

/**
 * Creates success response
 */
function createSuccessResponse(
    events: SimilarEventResponse[]
): NextResponse<SimilarEventsApiResponse> {
    return NextResponse.json({
        similarEvents: events,
        count: events.length,
    });
}

/**
 * Creates error response with appropriate status code
 */
function createErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
}
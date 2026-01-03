import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { getPersonalisedRecommendations, getTrendingEvents } from '@/lib/ml';
import { User } from '@/lib/models';
import {
    transformRecommendation,
    transformEvent,
    type EventResponse,
    type RecommendationResponse,
} from '@/lib/transformers/event-transformer';

// Force dynamic rendering (never cached)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RecommendationsApiResponse {
    recommendations: EventResponse[] | RecommendationResponse[];
    count: number;
    isPersonalised: boolean;
    timestamp: string;
}

/**
 * GET /api/recommendations
 * Returns personalised recommendations for authenticated users,
 * or trending events for unauthenticated users.
 *
 * Query params:
 * - limit: number of events to return (default: 12)
 * - category: filter by category
 * - excludeFavorited: exclude favourited events (default: true)
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const options = parseQueryParams(req);
        const session = await getServerSession(authOptions);

        // Try personalised recommendations for authenticated users
        if (session?.user?.email) {
            const user = await User.findOne({ email: session.user.email });

            if (user) {
                console.log(`[Recommendations] Generating personalised for user: ${user._id}`);

                const recommendations = await getPersonalisedRecommendations(
                    user._id as mongoose.Types.ObjectId,
                    user,
                    options
                );

                const events = recommendations.map(({ event, score, explanation }) =>
                    transformRecommendation(event, score, explanation.reason)
                );

                console.log(`[Recommendations] Returned ${events.length} personalised events`);

                return createSuccessResponse(events, true);
            }
        }

        // Fallback to trending events for unauthenticated users
        console.log('[Recommendations] Using trending (not personalised)');
        const trendingEvents = await getTrendingEvents(options);
        const events = trendingEvents.map(transformEvent);

        return createSuccessResponse(events, false);
    } catch (error) {
        console.error('[Recommendations] Error:', error);
        return createErrorResponse('Failed to get recommendations', 500);
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
        excludeFavourited: searchParams.get('excludeFavorited') !== 'false',
    };
}

/**
 * Creates success response with no-cache headers
 */
function createSuccessResponse(
    events: EventResponse[] | RecommendationResponse[],
    isPersonalised: boolean
): NextResponse<RecommendationsApiResponse> {
    const headers = new Headers({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    });

    return NextResponse.json(
        {
            recommendations: events,
            count: events.length,
            isPersonalised,
            timestamp: new Date().toISOString(),
        },
        { headers }
    );
}

/**
 * Creates error response with appropriate status code
 */
function createErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json({ error: message }, { status });
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { getPersonalisedRecommendations, getTrendingEvents } from '@/lib/ml';
import type { ScoredEvent } from '@/lib/ml';
import { User } from '@/lib/models';

// Force dynamic rendering (never cached)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '12');
        const category = searchParams.get('category') || undefined;
        const excludeFavourited = searchParams.get('excludeFavorited') !== 'false';

        const session = await getServerSession(authOptions);

        // Try to get personalised recommendations
        if (session?.user?.email) {
            const user = await User.findOne({ email: session.user.email });

            if (user) {
                console.log(`[Recommendations] Generating personalised for user: ${user._id}`);

                const recommendations = await getPersonalisedRecommendations(
                    user._id as mongoose.Types.ObjectId,
                    user,
                    { limit, category, excludeFavourited }
                );

                const events = formatScoredEvents(recommendations);
                console.log(`[Recommendations] Returned ${events.length} personalised events`);

                return createRecommendationsResponse(events, true);
            }
        }

        // Fallback to trending events
        console.log('[Recommendations] Using trending (not personalised)');
        const trendingEvents = await getTrendingEvents({ limit, category });
        const events = formatBasicEvents(trendingEvents);

        return createRecommendationsResponse(events, false);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to get recommendations' },
            { status: 500 }
        );
    }
}

/** Formats scored events with recommendation details. */
function formatScoredEvents(recommendations: ScoredEvent[]) {
    return recommendations.map(({ event, score, explanation }) => ({
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
        imageUrl: event.imageUrl,
        primarySource: event.primarySource,
        stats: event.stats || { viewCount: 0, favouriteCount: 0, clickthroughCount: 0 },
        score,
        reason: explanation.reason,
    }));
}

/** Formats basic events without scoring. */
function formatBasicEvents(events: any[]) {
    return events.map(event => ({
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
        imageUrl: event.imageUrl,
        primarySource: event.primarySource,
        stats: event.stats || { viewCount: 0, favouriteCount: 0, clickthroughCount: 0 },
    }));
}

/** Creates response with no-cache headers. */
function createRecommendationsResponse(events: any[], isPersonalised: boolean) {
    const headers = new Headers({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    });

    return NextResponse.json({
        recommendations: events,
        count: events.length,
        isPersonalised,
        timestamp: new Date().toISOString(),
    }, { headers });
}

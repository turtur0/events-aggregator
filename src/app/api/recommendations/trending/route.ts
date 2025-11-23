// app/api/recommendations/trending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTrendingEvents } from '@/lib/ml/recommendationService';
import { connectDB } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '12');
        const category = searchParams.get('category') || undefined;

        // Always get trending events (site-wide popular)
        const trendingEvents = await getTrendingEvents({
            limit,
            category,
        });

        const events = trendingEvents.map(event => ({
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
            stats: {
                viewCount: event.stats?.viewCount || 0,
                favouriteCount: event.stats?.favouriteCount || 0,
                clickthroughCount: event.stats?.clickthroughCount || 0,
            },
        }));

        return NextResponse.json({
            events,
            count: events.length,
        });
    } catch (error) {
        console.error('Error getting trending events:', error);
        return NextResponse.json(
            { error: 'Failed to get trending events' },
            { status: 500 }
        );
    }
}
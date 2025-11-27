import { NextRequest, NextResponse } from 'next/server';
import { getSimilarEvents } from '@/lib/ml';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

/**
 * GET /api/events/[eventId]/similar
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

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json(
                { error: 'Invalid event ID' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '6');

        const similarEvents = await getSimilarEvents(
            new mongoose.Types.ObjectId(eventId),
            { limit }
        );

        if (!similarEvents?.length) {
            return NextResponse.json({
                similarEvents: [],
                count: 0,
            });
        }

        const formatted = formatSimilarEvents(similarEvents);

        return NextResponse.json({
            similarEvents: formatted,
            count: formatted.length,
        });
    } catch (error) {
        console.error('Error getting similar events:', error);
        return NextResponse.json(
            {
                error: 'Failed to get similar events',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/** Formats similar events with similarity scores. */
function formatSimilarEvents(events: Array<{ event: any; similarity: number }>) {
    return events.map(({ event, similarity }) => ({
        _id: event._id.toString(),
        title: event.title,
        description: event.description,
        category: event.category,
        subcategories: event.subcategories || [],
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString(),
        venue: event.venue,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        isFree: event.isFree,
        bookingUrl: event.bookingUrl,
        imageUrl: event.imageUrl,
        primarySource: event.primarySource,
        stats: event.stats || {},
        similarity: Math.round(similarity * 100),
    }));
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models';

export interface EventComparisonData {
    eventStats: {
        price: number;
        priceMax?: number;
        popularity: number;
        views: number;
    };
    categoryStats: {
        avgPrice: number;
        medianPrice: number;
        minPrice: number;
        maxPrice: number;
        totalEvents: number;
        avgPopularity: number;
    };
    percentiles: {
        pricePercentile: number;
        priceMaxPercentile?: number;
        popularityPercentile: number;
    };
    similarEvents: Array<{
        id: string; 
        title: string;
        price: number;
        priceMax?: number;
        popularity: number;
    }>;
}

function calculatePercentile(sortedValues: number[], value: number): number {
    if (sortedValues.length === 0) return 0;
    const index = sortedValues.findIndex(v => v >= value);
    if (index === -1) return 100;
    if (index === 0) return 0;
    return Math.round((index / sortedValues.length) * 100);
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const eventId = request.nextUrl.searchParams.get('eventId');
        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const event = await Event.findById(eventId).lean();
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const now = new Date();

        // Get category events for comparison
        const categoryEvents = await Event.find({
            category: event.category,
            startDate: { $gte: now },
            isFree: false,
            priceMin: { $exists: true, $gt: 0 },
        })
            .select('title priceMin priceMax stats')
            .lean();

        if (categoryEvents.length === 0) {
            return NextResponse.json({
                error: 'No comparison data available',
                message: `No paid events found in ${event.category} category`
            }, { status: 404 });
        }

        // Price analysis
        const allPricePoints: number[] = [];
        const minPrices: number[] = [];

        categoryEvents.forEach(e => {
            const min = e.priceMin || 0;
            const max = e.priceMax;

            if (min > 0) {
                allPricePoints.push(min);
                minPrices.push(min);
            }
            if (max && max > min) {
                allPricePoints.push(max);
            }
        });

        const popularities = categoryEvents
            .map(e => e.stats?.categoryPopularityPercentile || 0)
            .filter(p => p > 0);

        const sortedAllPrices = [...allPricePoints].sort((a, b) => a - b);
        const sortedMinPrices = [...minPrices].sort((a, b) => a - b);
        const sortedPopularities = [...popularities].sort((a, b) => a - b);

        // Category statistics
        const categoryStats = {
            avgPrice: Math.round(minPrices.reduce((sum, p) => sum + p, 0) / minPrices.length),
            medianPrice: Math.round(sortedMinPrices[Math.floor(sortedMinPrices.length / 2)]),
            minPrice: Math.round(sortedAllPrices[0]),
            maxPrice: Math.round(sortedAllPrices[sortedAllPrices.length - 1]),
            totalEvents: categoryEvents.length,
            avgPopularity: popularities.length
                ? Math.round((popularities.reduce((sum, p) => sum + p, 0) / popularities.length) * 100)
                : 0,
        };

        // Event percentiles
        const eventPriceMin = event.priceMin || 0;
        const eventPriceMax = event.priceMax;
        const eventPopularity = event.stats?.categoryPopularityPercentile || 0;

        const pricePercentile = calculatePercentile(sortedAllPrices, eventPriceMin);
        const priceMaxPercentile = eventPriceMax && eventPriceMax > eventPriceMin
            ? calculatePercentile(sortedAllPrices, eventPriceMax)
            : undefined;
        const popularityPercentile = calculatePercentile(sortedPopularities, eventPopularity);

        // Similar events
        const priceLower = eventPriceMin * 0.8;
        const priceUpper = eventPriceMin * 1.2;

        const similarEvents = categoryEvents
            .filter(e => {
                const price = e.priceMin || 0;
                return price >= priceLower && price <= priceUpper && e._id.toString() !== eventId;
            })
            .sort((a, b) => (b.stats?.categoryPopularityPercentile || 0) - (a.stats?.categoryPopularityPercentile || 0))
            .slice(0, 5)
            .map(e => ({
                id: e._id.toString(),
                title: e.title,
                price: e.priceMin || 0,
                priceMax: e.priceMax,
                popularity: Math.round((e.stats?.categoryPopularityPercentile || 0) * 100),
            }));

        const data: EventComparisonData = {
            eventStats: {
                price: eventPriceMin,
                priceMax: eventPriceMax,
                popularity: Math.round(eventPopularity * 100),
                views: event.stats?.viewCount || 0,
            },
            categoryStats,
            percentiles: {
                pricePercentile,
                priceMaxPercentile,
                popularityPercentile,
            },
            similarEvents,
        };

        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Event Comparison API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to compute comparison data' },
            { status: 500 }
        );
    }
}
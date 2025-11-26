// app/api/analytics/debug-prices/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Event from '@/lib/models/Event';

export async function GET() {
    try {
        await connectDB();

        // Check price data for non-theatre events
        const musicEvents = await Event.find({ category: 'music' })
            .select('title category priceMin priceMax isFree priceDetails')
            .limit(10)
            .lean();

        const sportsEvents = await Event.find({ category: 'sports' })
            .select('title category priceMin priceMax isFree priceDetails')
            .limit(10)
            .lean();

        // Count events with missing prices
        const missingPrices = await Event.countDocuments({
            isFree: false,
            $or: [
                { priceMin: { $exists: false } },
                { priceMin: null },
                { priceMin: 0 }
            ]
        });

        // Count events that should have prices
        const shouldHavePrices = await Event.countDocuments({ isFree: false });

        return NextResponse.json({
            musicSamples: musicEvents,
            sportsSamples: sportsEvents,
            missingPrices,
            shouldHavePrices,
            percentageMissing: ((missingPrices / shouldHavePrices) * 100).toFixed(1)
        });
    } catch (error) {
        console.error('[Debug] Price debug error:', error);
        return NextResponse.json({ error: 'Failed to debug prices' }, { status: 500 });
    }
}
// app/api/analytics/price-distribution/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computePriceDistribution } from '@/lib/services/analyticsService';

export async function GET(request: Request) {
    try {
        await connectDB();

        // Parse query params for filtering
        const { searchParams } = new URL(request.url);
        const categoriesParam = searchParams.get('categories');

        // Split comma-separated categories
        const selectedCategories = categoriesParam
            ? categoriesParam.split(',').filter(Boolean)
            : undefined;

        const data = await computePriceDistribution(selectedCategories);
        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Price distribution error:', error);
        return NextResponse.json({ error: 'Failed to compute price distribution' }, { status: 500 });
    }
}
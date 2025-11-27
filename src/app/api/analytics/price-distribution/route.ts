import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computePriceDistribution } from '@/lib/services';
import parseCategoriesParam from '../../utils/parse-categories-param';

/**
 * GET /api/analytics/price-distribution
 * Computes price distribution analytics, optionally filtered by categories.
 * 
 * Query params:
 * - categories: comma-separated list of categories to filter by (optional)
 * 
 * @example /api/analytics/price-distribution?categories=music,theatre
 */
export async function GET(request: Request) {
    try {
        await connectDB();

        const categories = parseCategoriesParam(request.url);
        const data = await computePriceDistribution(categories);

        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Price distribution error:', error);
        return NextResponse.json(
            { error: 'Failed to compute price distribution' },
            { status: 500 }
        );
    }
}
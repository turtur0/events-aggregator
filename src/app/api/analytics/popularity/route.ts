import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computePopularityData } from '@/lib/services';
import parseCategoriesParam from '../../_utils/parse-categories-param';

/**
 * GET /api/analytics/popularity
 * Computes popularity analytics data, optionally filtered by categories.
 * 
 * Query params:
 * - categories: comma-separated list of categories to filter by (optional)
 * 
 * @example /api/analytics/popularity?categories=music,theatre
 */
export async function GET(request: Request) {
    try {
        await connectDB();

        const categories = parseCategoriesParam(request.url);
        const data = await computePopularityData(categories);

        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Popularity error:', error);
        return NextResponse.json(
            { error: 'Failed to compute popularity data' },
            { status: 500 }
        );
    }
}
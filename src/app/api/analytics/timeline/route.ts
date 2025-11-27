import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computeTimeline } from '@/lib/services';
import parseCategoriesParam from '../../utils/parse-categories-param';

/**
 * GET /api/analytics/timeline
 * Computes timeline analytics data, optionally filtered by categories.
 * 
 * Query params:
 * - categories: comma-separated list of categories to filter by (optional)
 * 
 * @example /api/analytics/timeline?categories=music,theatre
 */
export async function GET(request: Request) {
    try {
        await connectDB();

        const categories = parseCategoriesParam(request.url);
        const data = await computeTimeline(categories);

        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Timeline error:', error);
        return NextResponse.json(
            { error: 'Failed to compute timeline' },
            { status: 500 }
        );
    }
}

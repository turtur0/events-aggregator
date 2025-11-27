import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computeTimeline } from '@/lib/services/analyticsService';

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const categoriesParam = searchParams.get('categories');

        const selectedCategories = categoriesParam
            ? categoriesParam.split(',').filter(Boolean)
            : undefined;

        const data = await computeTimeline(selectedCategories);
        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Timeline error:', error);
        return NextResponse.json({ error: 'Failed to compute timeline' }, { status: 500 });
    }
}
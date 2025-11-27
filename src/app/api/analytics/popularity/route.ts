import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computePopularityData } from '@/lib/services';

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const categoriesParam = searchParams.get('categories');

        const selectedCategories = categoriesParam
            ? categoriesParam.split(',').filter(Boolean)
            : undefined;

        const data = await computePopularityData(selectedCategories);
        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Popularity error:', error);
        return NextResponse.json({ error: 'Failed to compute popularity data' }, { status: 500 });
    }
}
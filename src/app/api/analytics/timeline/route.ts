// app/api/analytics/timeline/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { computeTimeline } from '@/lib/services/analyticsService';

export async function GET() {
    try {
        await connectDB();
        const data = await computeTimeline();
        return NextResponse.json({ data });
    } catch (error) {
        console.error('[Analytics] Timeline error:', error);
        return NextResponse.json({ error: 'Failed to compute timeline' }, { status: 500 });
    }
}
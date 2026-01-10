import { NextRequest, NextResponse } from 'next/server';
import { getEvents, type EventFilters, type SortOption } from '@/lib/services/event-service';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // Parse filters (archived events have fewer filter options)
        const filters: EventFilters = {
            searchQuery: searchParams.get('q') || undefined,
            category: searchParams.get('category') || undefined,
            subcategory: searchParams.get('subcategory') || undefined,
            freeOnly: searchParams.get('free') === 'true',
            isArchived: true, // Key difference: archived filter
        };

        const sortOption = (searchParams.get('sort') as SortOption) || 'date-late';
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '18');

        const data = await getEvents(filters, sortOption, { page, pageSize });

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('[Archived Events API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch archived events' },
            { status: 500 }
        );
    }
}

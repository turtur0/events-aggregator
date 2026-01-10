import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
    getEvents, 
    getRecommendedEvents,
    type EventFilters,
    type SortOption 
} from '@/lib/services/event-service';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const session = await getServerSession(authOptions);

        // Parse filters
        const filters: EventFilters = {
            searchQuery: searchParams.get('q') || undefined,
            category: searchParams.get('category') || undefined,
            subcategory: searchParams.get('subcategory') || undefined,
            dateFilter: searchParams.get('date') as any || undefined,
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            freeOnly: searchParams.get('free') === 'true',
            priceMin: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined,
            priceMax: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined,
            accessibleOnly: searchParams.get('accessible') === 'true',
        };

        const sortOption = (searchParams.get('sort') as SortOption) || 'date-soon';
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '18');

        // Handle recommendations
        if (sortOption === 'recommended' && session?.user?.id) {
            const data = await getRecommendedEvents(
                session.user.id,
                filters,
                { page, pageSize }
            );
            return NextResponse.json(data, {
                headers: {
                    'Cache-Control': 'private, no-cache', // Don't cache personalized content
                },
            });
        }

        // Standard events
        const data = await getEvents(filters, sortOption, { page, pageSize });

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('[Events API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

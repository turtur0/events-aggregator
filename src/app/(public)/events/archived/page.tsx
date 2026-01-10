import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Metadata } from "next";
import { Archive } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { EventsPageLayout } from '@/components/layout/EventsPageLayout';
import { EventsGrid, EventsGridSkeleton } from '@/components/events/sections/EventsGrid';
import { SearchBar } from '@/components/events/filters/SearchBar';
import { EventFilters } from '@/components/events/filters/EventFilters';
import { getUserFavourites } from "@/lib/actions/interactions";
import { getEvents, type EventFilters as Filters, type SortOption } from "@/lib/services/event-service";

export const metadata: Metadata = {
    title: "Archived Events | Hoddle",
    description: "Browse Melbourne's event history. Explore past concerts, shows, festivals and cultural events for research and reference.",
    openGraph: {
        title: "Archived Events | Hoddle",
        description: "Browse Melbourne's event history and explore past concerts, shows and festivals.",
    },
};

interface ArchivedEventsPageProps {
    searchParams: Promise<{
        page?: string;
        q?: string;
        category?: string;
        subcategory?: string;
        free?: string;
        sort?: string;
    }>;
}

interface ArchivedEventsGridWrapperProps {
    page: number;
    filters: Filters;
    sortOption: SortOption;
    userFavourites: Set<string>;
}

async function ArchivedEventsGridWrapper(props: ArchivedEventsGridWrapperProps) {
    const data = await getEvents(props.filters, props.sortOption, { page: props.page, pageSize: 24 });

    const { events, pagination } = data;
    const { totalEvents, totalPages, currentPage } = pagination;

    const source = props.filters.searchQuery ? 'search' : props.filters.category ? 'category_browse' : 'direct';
    const hasFilters = Object.values(props.filters).some(v => v !== undefined && v !== false && v !== 'isArchived');

    return (
        <EventsGrid
            events={events}
            totalEvents={totalEvents}
            totalPages={totalPages}
            currentPage={currentPage}
            userFavourites={props.userFavourites}
            source={source}
            emptyTitle={hasFilters ? "No archived events found" : "No archived events yet"}
            emptyDescription={
                hasFilters
                    ? "No archived events match your filters. Try adjusting your search criteria."
                    : "Past events will appear here once they've been archived."
            }
        />
    );
}

export default async function ArchivedEventsPage({ searchParams }: ArchivedEventsPageProps) {
    const params = await searchParams;
    const session = await getServerSession(authOptions);

    // Parse parameters
    const currentPage = Number(params.page) || 1;
    const sortOption = (params.sort as SortOption) || 'date-late';

    // Build filters object
    const filters: Filters = {
        searchQuery: params.q || undefined,
        category: params.category || undefined,
        subcategory: params.subcategory || undefined,
        freeOnly: params.free === 'true',
        isArchived: true, // Key difference
    };

    // Get user favourites
    let userFavourites = new Set<string>();
    if (session?.user?.id) {
        const favouriteIds = await getUserFavourites(session.user.id);
        userFavourites = new Set(favouriteIds);
    }

    // Create unique key for Suspense
    const suspenseKey = `archived-${currentPage}-${JSON.stringify(filters)}-${sortOption}`;

    return (
        <EventsPageLayout
            icon={Archive}
            iconColor="text-muted-foreground"
            iconBgColor="bg-muted/50 ring-1 ring-border"
            title={filters.searchQuery ? `Archived: "${filters.searchQuery}"` : 'Archived Events'}
            description="Browse past events and shows from Melbourne's event history"
            filters={
                <div className="space-y-4">
                    <SearchBar placeholder="Search archived events..." />
                    <EventFilters
                        isAuthenticated={!!session?.user}
                        hideRecommendedSort={true}
                        hideDateFilters={true}
                        hideAccessibilityFilter={true}
                        isArchived={true}
                    />
                </div>
            }
        >
            <Suspense fallback={<EventsGridSkeleton />} key={suspenseKey}>
                <ArchivedEventsGridWrapper
                    page={currentPage}
                    filters={filters}
                    sortOption={sortOption}
                    userFavourites={userFavourites}
                />
            </Suspense>
        </EventsPageLayout>
    );
}
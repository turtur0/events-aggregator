import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Metadata } from "next";
import { Search } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { EventsPageLayout } from '@/components/layout/EventsPageLayout';
import { EventsGrid, EventsGridSkeleton } from '@/components/events/sections/EventsGrid';
import { SearchBar } from '@/components/events/filters/SearchBar';
import { EventFilters } from '@/components/events/filters/EventFilters';
import { getUserFavourites } from "@/lib/actions/interactions";
import { getEvents, getRecommendedEvents, type EventFilters as Filters, type SortOption } from "@/lib/services/event-service";

export const metadata: Metadata = {
  title: "All Events | Hoddle",
  description: "Browse all concerts, shows, festivals and events across Melbourne. Filter by category, date, price and more.",
  openGraph: {
    title: "All Events | Hoddle",
    description: "Browse all concerts, shows, festivals and events across Melbourne.",
  },
};

interface EventsPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    subcategory?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    free?: string;
    accessible?: string;
    sort?: string;
  }>;
}

interface EventsGridWrapperProps {
  page: number;
  filters: Filters;
  sortOption: SortOption;
  userFavourites: Set<string>;
  userId?: string;
}

async function EventsGridWrapper(props: EventsGridWrapperProps) {
  // Clean service layer call with recommendation support
  const data = props.sortOption === 'recommended' && props.userId
    ? await getRecommendedEvents(props.userId, props.filters, { page: props.page, pageSize: 24 })
    : await getEvents(props.filters, props.sortOption, { page: props.page, pageSize: 24 });

  const { events, pagination } = data;
  const { totalEvents, totalPages, currentPage } = pagination;

  const source = props.filters.searchQuery ? 'search' : props.filters.category ? 'category_browse' : 'direct';
  const hasFilters = Object.values(props.filters).some(v => v !== undefined && v !== false);

  return (
    <EventsGrid
      events={events}
      totalEvents={totalEvents}
      totalPages={totalPages}
      currentPage={currentPage}
      userFavourites={props.userFavourites}
      source={source}
      emptyTitle={hasFilters ? "No events found" : "No events yet"}
      emptyDescription={
        hasFilters
          ? "No events match your filters. Try adjusting your search criteria."
          : "We're working on populating the database with amazing Melbourne events. Check back soon!"
      }
    />
  );
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  // Parse parameters
  const currentPage = Number(params.page) || 1;
  const sortOption = (params.sort as SortOption) || 'date-soon';

  // Build filters object
  const filters: Filters = {
    searchQuery: params.q || undefined,
    category: params.category || undefined,
    subcategory: params.subcategory || undefined,
    dateFilter: params.date as any || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    freeOnly: params.free === 'true',
    accessibleOnly: params.accessible === 'true',
  };

  // Get user favourites
  let userFavourites = new Set<string>();
  if (session?.user?.id) {
    const favouriteIds = await getUserFavourites(session.user.id);
    userFavourites = new Set(favouriteIds);
  }

  // Create unique key for Suspense
  const suspenseKey = `${currentPage}-${JSON.stringify(filters)}-${sortOption}`;

  return (
    <EventsPageLayout
      icon={Search}
      iconColor="text-primary"
      iconBgColor="bg-primary/10 ring-1 ring-primary/20"
      title={filters.searchQuery ? `Search: "${filters.searchQuery}"` : 'All Events'}
      description="Discover concerts, shows, festivals and events across Melbourne"
      filters={
        <div className="space-y-4">
          <SearchBar />
          <EventFilters isAuthenticated={!!session?.user} />
        </div>
      }
    >
      <Suspense fallback={<EventsGridSkeleton />} key={suspenseKey}>
        <EventsGridWrapper
          page={currentPage}
          filters={filters}
          sortOption={sortOption}
          userFavourites={userFavourites}
          userId={session?.user?.id}
        />
      </Suspense>
    </EventsPageLayout>
  );
}
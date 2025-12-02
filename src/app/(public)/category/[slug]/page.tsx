import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Music, Theater, Trophy, Palette, Users, Sparkles, LucideIcon } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { EventsPageLayout } from '@/components/layout/EventsPageLayout';
import { EventsGrid, EventsGridSkeleton } from "@/components/events/sections/EventsGrid";
import { SearchBar } from '@/components/events/filters/SearchBar';
import { EventFilters } from '@/components/events/filters/EventFilters';
import { Badge } from '@/components/ui/Badge';
import { CATEGORIES } from "@/lib/constants/categories";
import { getUserFavourites } from "@/lib/actions/interactions";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    subcategory?: string;
    date?: string;
    free?: string;
  }>;
}

interface CategoryInfo {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  badgeClass: string;
}

const CATEGORY_CONFIG: Record<string, CategoryInfo> = {
  music: {
    title: 'Live Music & Concerts',
    description: 'From intimate gigs to stadium shows, find your next musical experience',
    icon: Music,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 ring-1 ring-orange-500/20',
    badgeClass: 'category-music',
  },
  theatre: {
    title: 'Theatre & Performing Arts',
    description: 'Plays, musicals, ballet, opera and more on Melbourne\'s stages',
    icon: Theater,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 ring-1 ring-rose-500/20',
    badgeClass: 'category-theatre',
  },
  sports: {
    title: 'Sports & Games',
    description: 'AFL, cricket, tennis and all the sporting action in Melbourne',
    icon: Trophy,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10 ring-1 ring-teal-500/20',
    badgeClass: 'category-sports',
  },
  arts: {
    title: 'Arts & Culture',
    description: 'Exhibitions, festivals, film screenings and cultural events',
    icon: Palette,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 ring-1 ring-purple-500/20',
    badgeClass: 'category-arts',
  },
  family: {
    title: 'Family Events',
    description: 'Fun for the whole family — kids shows, educational events and more',
    icon: Users,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 ring-1 ring-emerald-500/20',
    badgeClass: 'category-family',
  },
  other: {
    title: 'Other Events',
    description: 'Workshops, networking, wellness and community events',
    icon: Sparkles,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10 ring-1 ring-sky-500/20',
    badgeClass: 'category-other',
  },
};

async function fetchCategoryEvents(
  categoryValue: string,
  page: number,
  searchQuery: string,
  subcategory: string,
  dateFilter: string,
  freeOnly: boolean
) {
  const params = new URLSearchParams({
    page: page.toString(),
    category: categoryValue,
  });

  if (searchQuery.trim()) params.set('q', searchQuery.trim());
  if (subcategory) params.set('subcategory', subcategory);
  if (dateFilter) params.set('date', dateFilter);
  if (freeOnly) params.set('free', 'true');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/events?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  return response.json();
}

interface CategoryEventsGridWrapperProps {
  categoryValue: string;
  page: number;
  searchQuery: string;
  subcategory: string;
  dateFilter: string;
  freeOnly: boolean;
  userFavourites: Set<string>;
}

async function CategoryEventsGridWrapper(props: CategoryEventsGridWrapperProps) {
  const { events, pagination } = await fetchCategoryEvents(
    props.categoryValue,
    props.page,
    props.searchQuery,
    props.subcategory,
    props.dateFilter,
    props.freeOnly
  );

  const { totalEvents, totalPages } = pagination;
  const source = props.searchQuery ? 'search' : 'category_browse';

  return (
    <EventsGrid
      events={events}
      totalEvents={totalEvents}
      totalPages={totalPages}
      currentPage={props.page}
      userFavourites={props.userFavourites}
      source={source}
      emptyTitle="No events found"
      emptyDescription="No events in this category right now. Check back soon!"
    />
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const info = CATEGORY_CONFIG[slug];

  if (!info) {
    return { title: 'Category Not Found | Melbourne Events' };
  }

  return {
    title: `${info.title} | Melbourne Events`,
    description: `${info.description}. Browse all ${info.title.toLowerCase()} events in Melbourne.`,
    openGraph: {
      title: `${info.title} | Melbourne Events`,
      description: info.description,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;
  const categoryInfo = CATEGORY_CONFIG[slug];

  if (!categoryInfo) {
    notFound();
  }

  // Parse search parameters
  const currentPage = Number(resolvedParams.page) || 1;
  const searchQuery = resolvedParams.q || '';
  const subcategory = resolvedParams.subcategory || '';
  const dateFilter = resolvedParams.date || '';
  const freeOnly = resolvedParams.free === 'true';

  // Get user session and favourites
  const session = await getServerSession(authOptions);
  let userFavourites = new Set<string>();

  if (session?.user?.id) {
    const favouriteIds = await getUserFavourites(session.user.id);
    userFavourites = new Set(favouriteIds);
  }

  // Get category configuration for subcategories
  const categoryConfig = CATEGORIES.find(c => c.value === slug);
  const suspenseKey = `${slug}-${currentPage}-${searchQuery}-${subcategory}-${dateFilter}-${freeOnly}`;

  return (
    <EventsPageLayout
      icon={categoryInfo.icon}
      iconColor={categoryInfo.color}
      iconBgColor={categoryInfo.bgColor}
      title={categoryInfo.title}
      description={categoryInfo.description}
      filters={
        <div className="space-y-4">
          <SearchBar placeholder={`Search ${categoryInfo.title.toLowerCase()}...`} />

          {/* Subcategory Filter Pills */}
          {categoryConfig?.subcategories && categoryConfig.subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/category/${slug}`}>
                <Badge
                  variant="outline"
                  className={`cursor-pointer text-sm px-4 py-2 border-2 transition-all hover-lift ${!subcategory ? categoryInfo.badgeClass : 'badge-outline-hover'
                    }`}
                >
                  All
                </Badge>
              </Link>
              {categoryConfig.subcategories.map((sub) => (
                <Link
                  key={sub}
                  href={`/category/${slug}?subcategory=${encodeURIComponent(sub)}`}
                >
                  <Badge
                    variant="outline"
                    className={`cursor-pointer text-sm px-4 py-2 border-2 transition-all hover-lift ${subcategory === sub ? categoryInfo.badgeClass : 'badge-outline-hover'
                      }`}
                  >
                    {sub}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          <EventFilters
            isAuthenticated={!!session?.user}
            hideCategoryFilter={true}
            hideSubcategoryFilter={true}
          />
        </div>
      }
    >
      <Suspense fallback={<EventsGridSkeleton />} key={suspenseKey}>
        <CategoryEventsGridWrapper
          categoryValue={slug}
          page={currentPage}
          searchQuery={searchQuery}
          subcategory={subcategory}
          dateFilter={dateFilter}
          freeOnly={freeOnly}
          userFavourites={userFavourites}
        />
      </Suspense>
    </EventsPageLayout>
  );
}
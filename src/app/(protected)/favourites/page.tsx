import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Metadata } from "next";
import Link from 'next/link';
import mongoose from 'mongoose';
import { Heart, Sparkles } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { EventsPageLayout } from '@/components/layout/EventsPageLayout';
import { EventsGrid } from '@/components/events/sections/EventsGrid';
import { EmptyState } from '@/components/other/EmptyState';
import { SearchBar } from '@/components/events/filters/SearchBar';
import { EventFilters } from '@/components/events/filters/EventFilters';
import { UserFavourite, Event } from '@/lib/models';

export const metadata: Metadata = {
    title: "My Favourites | Melbourne Events",
    description: "View and manage your saved Melbourne events. Keep track of concerts, shows and festivals you don't want to miss.",
    robots: "noindex, nofollow", // Private page
};

const ITEMS_PER_PAGE = 12;

interface FavouritesPageProps {
    searchParams: Promise<{
        page?: string;
        q?: string;
        category?: string;
        subcategory?: string;
        date?: string;
        free?: string;
    }>;
}

interface FilterOptions {
    searchQuery?: string;
    category?: string;
    subcategory?: string;
    dateFilter?: string;
    freeOnly?: boolean;
}

async function getFavouritesWithFilters(
    userId: string,
    page: number,
    filters: FilterOptions
) {
    // Get favourite event IDs
    const favourites = await UserFavourite.find({
        userId: new mongoose.Types.ObjectId(userId)
    }).select('eventId').lean();

    const eventIds = favourites.map(f => f.eventId);

    if (eventIds.length === 0) {
        return { events: [], totalFavourites: 0, totalPages: 0 };
    }

    // Build event query with filters
    const eventQuery: any = {
        _id: { $in: eventIds },
        isArchived: { $ne: true }
    };

    if (filters.searchQuery) {
        eventQuery.$or = [
            { title: { $regex: filters.searchQuery, $options: 'i' } },
            { description: { $regex: filters.searchQuery, $options: 'i' } },
        ];
    }

    if (filters.category) eventQuery.category = filters.category;
    if (filters.subcategory) eventQuery.subcategories = filters.subcategory;
    if (filters.freeOnly) eventQuery.isFree = true;

    // Apply date filters
    if (filters.dateFilter) {
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));

        switch (filters.dateFilter) {
            case 'today': {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                eventQuery.startDate = { $gte: today, $lt: tomorrow };
                break;
            }
            case 'this-week': {
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                eventQuery.startDate = { $gte: today, $lt: weekEnd };
                break;
            }
            case 'this-month': {
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                eventQuery.startDate = { $gte: today, $lt: monthEnd };
                break;
            }
        }
    }

    const totalFavourites = await Event.countDocuments(eventQuery);
    const totalPages = Math.ceil(totalFavourites / ITEMS_PER_PAGE);

    const events = await Event.find(eventQuery)
        .sort({ startDate: 1 })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .lean();

    return { events, totalFavourites, totalPages };
}

export default async function FavouritesPage({ searchParams }: FavouritesPageProps) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin?callbackUrl=/favourites');
    }

    const params = await searchParams;

    // Parse search parameters
    const currentPage = Number(params.page) || 1;
    const searchQuery = params.q || '';
    const category = params.category || '';
    const subcategory = params.subcategory || '';
    const dateFilter = params.date || '';
    const freeOnly = params.free === 'true';

    await connectDB();

    // Fetch favourites with filters
    const { events, totalFavourites, totalPages } = await getFavouritesWithFilters(
        session.user.id,
        currentPage,
        { searchQuery, category, subcategory, dateFilter, freeOnly }
    );

    // Serialise events
    const serialisedEvents = events.map(e => ({
        _id: e._id.toString(),
        title: e.title,
        description: e.description,
        category: e.category,
        subcategories: e.subcategories || [],
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString(),
        venue: e.venue,
        priceMin: e.priceMin,
        priceMax: e.priceMax,
        isFree: e.isFree,
        bookingUrl: e.bookingUrl,
        imageUrl: e.imageUrl,
        primarySource: e.primarySource,
        sources: e.sources || [],
    }));

    // Get all user favourites for heart icons
    const allFavourites = await UserFavourite.find({
        userId: new mongoose.Types.ObjectId(session.user.id)
    }).select('eventId').lean();

    const userFavourites = new Set(allFavourites.map(f => f.eventId.toString()));

    const hasFilters = searchQuery || category || subcategory || dateFilter || freeOnly;

    return (
        <EventsPageLayout
            icon={Heart}
            iconColor="text-red-500 fill-red-500"
            iconBgColor="bg-red-500/10 ring-1 ring-red-500/20"
            title="My Favourites"
            description="Events you've saved for later"
            badge={totalFavourites > 0 ? {
                text: `${totalFavourites} saved event${totalFavourites !== 1 ? 's' : ''}`,
                className: 'text-base px-4 py-2 bg-red-500/10 text-red-700 dark:text-red-400 border-2 border-red-500/30 hover:bg-red-500/20 transition-colors'
            } : undefined}
            filters={
                <div className="space-y-4">
                    <SearchBar placeholder="Search your favourites..." />
                    <EventFilters isAuthenticated={true} />
                </div>
            }
        >
            {/* Empty State */}
            {totalFavourites === 0 && !hasFilters ? (
                <div className="max-w-2xl mx-auto">
                    <EmptyState
                        title="No favourites yet"
                        description="Start exploring events and tap the heart icon to save them here for easy access later."
                    />
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                        <Button asChild size="lg" className="group">
                            <Link href="/events">
                                <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" />
                                Discover Events
                            </Link>
                        </Button>

                        <Button variant="outline" size="lg" asChild className="border-2">
                            <Link href="/category/music">Browse Music</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <EventsGrid
                    events={serialisedEvents}
                    totalEvents={totalFavourites}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    userFavourites={userFavourites}
                    source="favourites"
                    emptyTitle="No favourites match your filters"
                    emptyDescription="Try adjusting your search or filters to find your saved events."
                />
            )}
        </EventsPageLayout>
    );
}
// app/(protected)/favourites/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/other/EmptyState';
import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import mongoose from 'mongoose';
import { Heart, Sparkles } from 'lucide-react';
import { UserFavourite } from '@/lib/models';

export default async function FavouritesPage() {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin?callbackUrl=/favourites');
    }

    await connectDB();

    // Fetch user's favourites with populated event data
    const favourites = await UserFavourite.find({
        userId: new mongoose.Types.ObjectId(session.user.id)
    })
        .sort({ createdAt: -1 })
        .populate('eventId')
        .lean();

    // Serialize events for client components
    const events = favourites
        .filter(f => f.eventId)
        .map(f => {
            const e = f.eventId as any;
            return {
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
            };
        });

    return (
        <div className="w-full min-h-screen bg-linear-to-b from-background via-red-50/30 to-background dark:from-background dark:via-red-950/5 dark:to-background">
            {/* Header Section */}
            <section className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <BackButton fallbackUrl="/" className="mb-6" />

                    <div className="flex items-start justify-between flex-wrap gap-6">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-500/20">
                                <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
                                    My Favourites
                                </h1>
                                <p className="text-lg text-muted-foreground">
                                    Events you've saved for later
                                </p>
                            </div>
                        </div>
                        {events.length > 0 && (
                            <Badge
                                variant="secondary"
                                className="text-base px-4 py-2 bg-red-500/10 text-red-700 dark:text-red-400 border-2 border-red-500/30 hover:bg-red-500/20 transition-colors"
                            >
                                {events.length} saved event{events.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {events.length === 0 ? (
                        // Empty state
                        <div className="max-w-2xl mx-auto">
                            <EmptyState
                                title="No favourites yet"
                                description="Start exploring events and tap the heart icon to save them here for easy access later."
                            />
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                                <Button
                                    asChild
                                    size="lg"
                                    className="border-2 border-primary/30 hover:border-primary/50 transition-all hover-lift group"
                                >
                                    <Link href="/events" className="flex items-center">
                                        <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                                        Discover Events
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    asChild
                                    className="border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all hover-lift"
                                >
                                    <Link href="/category/music">
                                        Browse Music
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Event grid
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <EventCard
                                    key={event._id}
                                    event={event as any}
                                    initialFavourited={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
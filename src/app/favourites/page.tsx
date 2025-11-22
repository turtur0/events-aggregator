import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import UserFavourite from '@/lib/models/UserFavourites';
import { EventCard } from '@/components/events/event-card';
import { EmptyState } from '@/components/other/empty-state';
import mongoose from 'mongoose';
import { Heart } from 'lucide-react';

export default async function FavouritesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/auth/signin?callbackUrl=/favourites');
    }

    await connectDB();

    // Get user's favourites with event details
    const favourites = await UserFavourite.find({
        userId: new mongoose.Types.ObjectId(session.user.id)
    })
        .sort({ createdAt: -1 })
        .populate('eventId')
        .lean();

    // Filter out any deleted events and serialise
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
        <main className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                    My Favourites
                </h1>
                <p className="text-muted-foreground">
                    Events you've saved for later
                </p>
            </div>

            {events.length === 0 ? (
                <EmptyState
                    title="No favourites yet"
                    description="Start exploring events and tap the heart icon to save them here."
                />
            ) : (
                <>
                    <p className="text-sm text-muted-foreground mb-6">
                        {events.length} saved event{events.length !== 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <EventCard
                                key={event._id}
                                event={event as any}
                                initialFavourited={true}
                            />
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}
'use client';

import { useEffect, useState } from 'react';
import { EventCard } from '@/components/events/event-card';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrendingSectionProps {
    userFavourites: Set<string>;
}

export function TrendingSection({ userFavourites }: TrendingSectionProps) {
    const [events, setEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTrending() {
            try {
                const res = await fetch('/api/recommendations?limit=6');
                const data = await res.json();

                if (!res.ok || !data.recommendations) {
                    setEvents([]);
                    return;
                }

                // Only show if not personalized (unauthenticated)
                if (!data.isPersonalized) {
                    setEvents(data.recommendations || []);
                } else {
                    setEvents([]); // User is logged in, don't show trending
                }
            } catch (error) {
                console.error('Error fetching trending:', error);
                setError('Failed to load trending events');
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTrending();
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Trending Now
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!events || events.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Now
                </CardTitle>
                <p className="text-sm text-muted-foreground">Popular events this week</p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <EventCard
                            key={event._id}
                            event={event}
                            source="homepage"
                            initialFavourited={userFavourites.has(event._id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
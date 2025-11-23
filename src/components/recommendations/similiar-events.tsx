'use client';

import { useEffect, useState } from 'react';
import { EventCard } from '@/components/events/event-card';
import { Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimilarEventsProps {
    eventId: string;
    userFavourites: Set<string>;
}

export function SimilarEvents({ eventId, userFavourites }: SimilarEventsProps) {
    const [events, setEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSimilar() {
            try {
                const res = await fetch(`/api/recommendations/similar/${eventId}`);
                const data = await res.json();

                if (!res.ok || !data.similarEvents) {
                    setEvents([]);
                    return;
                }

                setEvents(data.similarEvents || []);
            } catch (error) {
                console.error('Error fetching similar events:', error);
                setError('Failed to load similar events');
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchSimilar();
    }, [eventId]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Similar Events
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
                    <Sparkles className="h-5 w-5" />
                    Similar Events
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {events.length} events you might like
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <EventCard
                            key={event._id}
                            event={event}
                            source="similar_events"
                            initialFavourited={userFavourites.has(event._id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
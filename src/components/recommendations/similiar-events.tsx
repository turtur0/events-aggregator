'use client';

import { useEffect, useState } from 'react';
import { EventCard } from '@/components/events/event-card';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimilarEventsProps {
    eventId: string;
    userFavourites: Set<string>;
}

interface SimilarEvent {
    event: any;
    similarity: number;
}

export function SimilarEvents({ eventId, userFavourites }: SimilarEventsProps) {
    const [events, setEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSimilar() {
            try {
                const res = await fetch(`/api/recommendations/similar/${eventId}`);

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('API Error:', res.status, errorData);
                    throw new Error(errorData.error || 'Failed to fetch similar events');
                }

                const data = await res.json();
                console.log('Similar events data:', data);

                if (!data.similarEvents || data.similarEvents.length === 0) {
                    setEvents([]);
                    return;
                }

                // The API already returns formatted events, no need to extract
                setEvents(data.similarEvents);
            } catch (error) {
                console.error('Error fetching similar events:', error);
                setError('Unable to load similar events');
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        if (eventId) {
            fetchSimilar();
        }
    }, [eventId]);

    // Loading state
    if (isLoading) {
        return (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="h-6 w-6 text-primary" />
                        You Might Also Like
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Finding similar events...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    // No events state - hide component entirely
    if (!events || events.length === 0) {
        return null;
    }

    // Success state with events
    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                            <Sparkles className="h-6 w-6 text-primary" />
                            You Might Also Like
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {events.length} {events.length === 1 ? 'event' : 'events'} similar to this one
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
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
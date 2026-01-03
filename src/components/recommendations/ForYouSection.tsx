'use client';

import { useEffect, useState } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EventCarousel } from '@/components/events/sections/EventCarousel';
import { EventSection } from '@/components/events/sections/EventSection';
import { CarouselSkeleton } from '@/components/other/CarouselSkeleton';
import Link from 'next/link';
import type { EventResponse } from '@/lib/transformers/event-transformer';

interface ForYouSectionProps {
    userFavourites: Set<string>;
}

interface RecommendationsApiResponse {
    recommendations: EventResponse[];
    count: number;
    isPersonalised: boolean;
    timestamp: string;
}

export function ForYouSection({ userFavourites }: ForYouSectionProps) {
    const [events, setEvents] = useState<EventResponse[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPersonalised, setIsPersonalised] = useState(false);

    useEffect(() => {
        async function fetchRecommendations() {
            try {
                const timestamp = Date.now();
                const res = await fetch(`/api/recommendations?limit=12&t=${timestamp}`, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                    },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    console.error('[ForYou] API error:', res.status, res.statusText);
                    setEvents([]);
                    return;
                }

                const data: RecommendationsApiResponse = await res.json();

                setEvents(data.recommendations || []);
                setIsPersonalised(data.isPersonalised || false);
            } catch (error) {
                console.error('[ForYou] Error fetching recommendations:', error);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRecommendations();
    }, []);

    if (isLoading) {
        return (
            <CarouselSkeleton
                icon={<Heart className="h-6 w-6 text-primary" />}
                borderClass="border-primary/20"
                gradientClass="from-primary/5"
            />
        );
    }

    if (!events || events.length === 0) {
        return (
            <EventSection
                title="For You"
                description="Personalised recommendations based on your favourites"
                icon={<Heart className="h-6 w-6 text-primary" />}
                borderClass="border-primary/20"
                gradientClass="from-primary/5"
                isEmpty
            >
                <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">
                        We're still learning your preferences!
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Start favouriting events to get personalised recommendations tailored just for you.
                    </p>
                    <Button asChild className="mt-4 hover-lift group">
                        <Link href="/events">
                            Browse Events
                            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </Button>
                </div>
            </EventSection>
        );
    }

    return (
        <EventCarousel
            events={events}
            userFavourites={userFavourites}
            title="For You"
            description={
                isPersonalised
                    ? 'Personalised recommendations based on your favourites'
                    : 'Discover great events happening in Melbourne'
            }
            icon={<Heart className="h-6 w-6 text-primary" />}
            source="recommendation"
            borderClass="border-primary/20"
            gradientClass="from-primary/5"
            autoScroll
            showProgress
        />
    );
}
// components/recommendations/for-you-section.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CarouselSkeleton } from '@/components/skeletons/CarouselSkeleton';
import Link from 'next/link';

interface ForYouSectionProps {
    userFavourites: Set<string>;
}

export function ForYouSection({ userFavourites }: ForYouSectionProps) {
    const [events, setEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPersonalized, setIsPersonalized] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fetch recommendations on mount
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

                const data = await res.json();

                if (!res.ok || !data.recommendations) {
                    setEvents([]);
                    return;
                }

                setEvents(data.recommendations || []);
                setIsPersonalized(data.isPersonalized || false);
            } catch (error) {
                console.error('[ForYou] Error fetching recommendations:', error);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRecommendations();
    }, []);

    // Auto-scroll carousel every 5 seconds
    useEffect(() => {
        if (!events || events.length === 0 || isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % events.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [events, isHovered]);

    // Smooth scroll to current index
    useEffect(() => {
        if (!scrollContainerRef.current || !events) return;

        const container = scrollContainerRef.current;
        const cardWidth = container.scrollWidth / events.length;
        const scrollPosition = currentIndex * cardWidth;

        container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }, [currentIndex, events]);

    // Navigation handlers
    const handlePrevious = () => {
        if (!events) return;
        setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
    };

    const handleNext = () => {
        if (!events) return;
        setCurrentIndex((prev) => (prev + 1) % events.length);
    };

    // Loading state
    if (isLoading) {
        return (
            <CarouselSkeleton
                icon={<Heart className="h-6 w-6 text-primary" />}
                borderClass="border-primary/20"
                gradientClass="from-primary/5"
            />
        );
    }

    // Empty state
    if (!events || events.length === 0) {
        return (
            <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                        <Heart className="h-6 w-6 text-primary" />
                        For You
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Personalized recommendations based on your favorites
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 space-y-4">
                        <p className="text-muted-foreground">
                            We're still learning your preferences!
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Start favoriting events to get personalized recommendations tailored just for you.
                        </p>
                        <Button asChild className="mt-4 hover-lift group">
                            <Link href="/events">
                                Browse Events
                                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                            <Heart className="h-6 w-6 text-primary" />
                            For You
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {isPersonalized
                                ? "Personalized recommendations based on your favorites"
                                : "Discover great events happening in Melbourne"
                            }
                        </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevious}
                            className="h-9 w-9 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all hover-lift"
                            aria-label="Previous recommendation"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            className="h-9 w-9 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all hover-lift"
                            aria-label="Next recommendation"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Event carousel */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {events.map((event) => (
                        <div
                            key={event._id}
                            className="flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start"
                        >
                            <EventCard
                                event={event}
                                source="recommendation"
                                initialFavourited={userFavourites.has(event._id)}
                            />
                        </div>
                    ))}
                </div>

                {/* Progress indicators */}
                <div className="flex justify-center gap-2 mt-6">
                    {events.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                                    ? 'w-8 bg-primary shadow-sm'
                                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                }`}
                            aria-label={`Go to event ${index + 1}`}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
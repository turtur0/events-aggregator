// components/recommendations/trending-section.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { Loader2, TrendingUp, Sparkles, Rocket, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface TrendingSectionProps {
    userFavourites: Set<string>;
}

type TrendingType = 'trending' | 'rising' | 'undiscovered';

const TRENDING_CONFIG = {
    trending: {
        title: 'Trending Now',
        description: "Popular events everyone's talking about",
        icon: TrendingUp,
        borderClass: 'border-secondary/20 hover:border-secondary/30',
        gradientClass: 'from-secondary/5',
        iconColor: 'text-secondary',
        progressColor: 'bg-secondary',
    },
    rising: {
        title: 'Rising Stars',
        description: 'Fast-growing events gaining momentum',
        icon: Rocket,
        borderClass: 'border-secondary/20 hover:border-secondary/30',
        gradientClass: 'from-secondary/5',
        iconColor: 'text-secondary',
        progressColor: 'bg-secondary',
    },
    undiscovered: {
        title: 'Hidden Gems',
        description: 'Quality events waiting to be discovered',
        icon: Sparkles,
        borderClass: 'border-secondary/20 hover:border-secondary/30',
        gradientClass: 'from-secondary/5',
        iconColor: 'text-secondary',
        progressColor: 'bg-secondary',
    },
};

export function TrendingSection({ userFavourites }: TrendingSectionProps) {
    const [type, setType] = useState<TrendingType>('trending');
    const [events, setEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const config = TRENDING_CONFIG[type];
    const Icon = config.icon;

    useEffect(() => {
        async function fetchEvents() {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/recommendations/trending?type=${type}&limit=12`);
                const data = await res.json();

                if (!res.ok || !data.events) {
                    setEvents([]);
                    return;
                }

                setEvents(data.events || []);
                setCurrentIndex(0);
            } catch (error) {
                console.error('Error fetching events:', error);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchEvents();
    }, [type]);

    useEffect(() => {
        if (!events || events.length === 0 || isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % events.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [events, isHovered]);

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

    const handlePrevious = () => {
        if (!events) return;
        setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
    };

    const handleNext = () => {
        if (!events) return;
        setCurrentIndex((prev) => (prev + 1) % events.length);
    };

    if (isLoading) {
        return (
            <Card className={`border-2 ${config.borderClass} bg-linear-to-br{config.gradientClass} via-transparent to-transparent shadow-sm transition-all`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Icon className={`h-6 w-6 ${config.iconColor}`} />
                        {config.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-16">
                        <Loader2 className={`h-10 w-10 animate-spin ${config.iconColor}`} />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!events || events.length === 0) {
        return (
            <Card className={`border-2 ${config.borderClass} bg-linear-to-br ${config.gradientClass} via-transparent to-transparent shadow-sm transition-all`}>
                <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                                <Icon className={`h-6 w-6 ${config.iconColor}`} />
                                {config.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {config.description}
                            </p>
                        </div>
                    </div>
                    <Tabs value={type} onValueChange={(v) => setType(v as TrendingType)}>
                        <TabsList>
                            <TabsTrigger value="trending">Trending</TabsTrigger>
                            <TabsTrigger value="rising">Rising</TabsTrigger>
                            <TabsTrigger value="undiscovered">Hidden Gems</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No {type} events at the moment. Try another category!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`relative overflow-hidden border-2 ${config.borderClass} bg-linear-to-br ${config.gradientClass} via-transparent to-transparent shadow-sm transition-all`}>
            <CardHeader>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                            <Icon className={`h-6 w-6 ${config.iconColor}`} />
                            {config.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {config.description}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevious}
                            className="h-9 w-9 border-secondary/30 hover:border-secondary/50 hover:bg-secondary/10 transition-all"
                            aria-label="Previous event"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            className="h-9 w-9 border-secondary/30 hover:border-secondary/50 hover:bg-secondary/10 transition-all"
                            aria-label="Next event"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Tabs value={type} onValueChange={(v) => setType(v as TrendingType)}>
                    <TabsList>
                        <TabsTrigger value="trending">Trending</TabsTrigger>
                        <TabsTrigger value="rising">Rising</TabsTrigger>
                        <TabsTrigger value="undiscovered">Hidden Gems</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
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
                                initialFavourited={userFavourites.has(event._id)}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-2 mt-6">
                    {events.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                index === currentIndex
                                    ? `w-8 ${config.progressColor} shadow-sm`
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
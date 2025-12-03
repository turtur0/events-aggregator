'use client';

import { useEffect, useState, useRef } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EventCard } from '@/components/events/cards/EventCard';
import { CarouselSkeleton } from '@/components/other/CarouselSkeleton';
import Link from 'next/link';

interface UpcomingEventsProps {
    userFavourites: Set<string>;
}

interface CarouselSection {
    title: string;
    events: any[];
    index: number;
    setIndex: (fn: (prev: number) => number) => void;
    isHovered: boolean;
    setIsHovered: (val: boolean) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    color: 'primary' | 'secondary';
}

function CarouselSection({ title, events, index, setIndex, isHovered, setIsHovered, scrollRef, color }: CarouselSection) {
    const navigate = (dir: 'prev' | 'next') => {
        setIndex(prev => dir === 'next' ? prev + 1 : (prev <= events.length ? prev + events.length - 1 : prev - 1));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className={`w-1 h-6 bg-${color} rounded-full`} />
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('prev')}
                        className={`h-9 w-9 border-2 border-${color}/20 hover:border-${color}/50 hover:bg-${color}/10 transition-all duration-300 hover-lift hover:scale-110 active:scale-95`}
                        aria-label="Previous event"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('next')}
                        className={`h-9 w-9 border-2 border-${color}/20 hover:border-${color}/50 hover:bg-${color}/10 transition-all duration-300 hover-lift hover:scale-110 active:scale-95`}
                        aria-label="Next event"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-hidden transition-all duration-500 ease-out"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {[...events, ...events, ...events].map((event, idx) => (
                    <div key={`${event._id}-${idx}`} className="flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                        <EventCard event={event} source="homepage" initialFavourited={event._isFavourited} />
                    </div>
                ))}
            </div>

            {events.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    {events.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(() => events.length + i)}
                            className={`h-1.5 rounded-full transition-all duration-500 ease-out hover:scale-125 ${i === (index % events.length)
                                    ? `w-8 bg-${color} shadow-sm shadow-${color}/50`
                                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                }`}
                            aria-label={`Go to event ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function UpcomingEvents({ userFavourites }: UpcomingEventsProps) {
    const [thisWeekEvents, setThisWeekEvents] = useState<any[] | null>(null);
    const [thisMonthEvents, setThisMonthEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [weekIndex, setWeekIndex] = useState(0);
    const [monthIndex, setMonthIndex] = useState(0);
    const [isWeekHovered, setIsWeekHovered] = useState(false);
    const [isMonthHovered, setIsMonthHovered] = useState(false);
    const weekScrollRef = useRef<HTMLDivElement>(null);
    const monthScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchUpcomingEvents() {
            try {
                const now = new Date();
                const endOfWeek = new Date(now);
                endOfWeek.setDate(now.getDate() + 7);
                endOfWeek.setHours(23, 59, 59, 999);

                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);

                const allEvents: any[] = [];
                for (let page = 1; page <= 3; page++) {
                    const res = await fetch(`/api/events?page=${page}&sort=startDate`, {
                        method: 'GET',
                        headers: { 'Cache-Control': 'no-cache' },
                        cache: 'no-store',
                    });
                    const data = await res.json();
                    const filtered = (data.events || []).filter((e: any) => {
                        const d = new Date(e.startDate);
                        return d >= now && d <= endOfMonth;
                    });
                    allEvents.push(...filtered);
                    if (!data.pagination?.hasMore || filtered.length === 0) break;
                }

                const weekEvents = allEvents.filter(e => new Date(e.startDate) <= endOfWeek);
                const laterEvents = allEvents.filter(e => new Date(e.startDate) > endOfWeek);

                // Add favourite flag to events
                weekEvents.forEach(e => e._isFavourited = userFavourites.has(e._id));
                laterEvents.forEach(e => e._isFavourited = userFavourites.has(e._id));

                setThisWeekEvents(weekEvents.slice(0, 12));
                setThisMonthEvents(laterEvents.slice(0, 12));
            } catch (error) {
                console.error('[UpcomingEvents] Error:', error);
                setThisWeekEvents([]);
                setThisMonthEvents([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchUpcomingEvents();
    }, [userFavourites]);

    // Auto-scroll intervals
    useEffect(() => {
        if (!thisWeekEvents?.length || isWeekHovered) return;
        const id = setInterval(() => setWeekIndex(p => p + 1), 5000);
        return () => clearInterval(id);
    }, [thisWeekEvents, isWeekHovered]);

    useEffect(() => {
        if (!thisMonthEvents?.length || isMonthHovered) return;
        const id = setInterval(() => setMonthIndex(p => p + 1), 5000);
        return () => clearInterval(id);
    }, [thisMonthEvents, isMonthHovered]);

    // Scroll handlers
    const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, events: any[] | null, index: number, setIndex: (i: number) => void) => {
        if (!ref.current || !events?.length) return;
        const container = ref.current;
        const gap = 24;
        const cardWidth = (container.offsetWidth - gap * 2) / 3;

        let scrollIndex = index;
        let shouldAnimate = true;

        if (index >= events.length * 2) {
            scrollIndex = index - events.length;
            setIndex(scrollIndex);
            shouldAnimate = false;
        }

        container.style.scrollBehavior = shouldAnimate ? 'smooth' : 'auto';
        container.scrollLeft = scrollIndex * (cardWidth + gap);
        if (!shouldAnimate) setTimeout(() => container.style.scrollBehavior = 'smooth', 50);
    };

    useEffect(() => handleScroll(weekScrollRef, thisWeekEvents, weekIndex, setWeekIndex), [weekIndex, thisWeekEvents]);
    useEffect(() => handleScroll(monthScrollRef, thisMonthEvents, monthIndex, setMonthIndex), [monthIndex, thisMonthEvents]);

    if (isLoading) {
        return <CarouselSkeleton icon={<Calendar className="h-6 w-6 text-primary" />} borderClass="border-primary/20" gradientClass="from-primary/5" />;
    }

    const hasWeek = thisWeekEvents && thisWeekEvents.length > 0;
    const hasMonth = thisMonthEvents && thisMonthEvents.length > 0;

    if (!hasWeek && !hasMonth) {
        return (
            <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-transparent to-transparent shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                        <Calendar className="h-6 w-6 text-primary" />
                        Upcoming Events
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Don't miss what's happening in Melbourne</p>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 space-y-4">
                        <p className="text-muted-foreground">No upcoming events at the moment.</p>
                        <p className="text-sm text-muted-foreground">Check back soon for new events!</p>
                        <Button asChild className="mt-4 hover-lift group">
                            <Link href="/events">
                                Browse All Events
                                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:border-opacity-50 transition-all">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl mb-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Upcoming Events
                </CardTitle>
                <p className="text-sm text-muted-foreground">Don't miss what's happening in Melbourne</p>
            </CardHeader>
            <CardContent className="space-y-6">
                {hasWeek && (
                    <CarouselSection
                        title="This Week"
                        events={thisWeekEvents!}
                        index={weekIndex}
                        setIndex={setWeekIndex}
                        isHovered={isWeekHovered}
                        setIsHovered={setIsWeekHovered}
                        scrollRef={weekScrollRef}
                        color="primary"
                    />
                )}
                {hasWeek && hasMonth && <div className="border-t-2 border-border/50" />}
                {hasMonth && (
                    <CarouselSection
                        title="Coming This Month"
                        events={thisMonthEvents!}
                        index={monthIndex}
                        setIndex={setMonthIndex}
                        isHovered={isMonthHovered}
                        setIsHovered={setIsMonthHovered}
                        scrollRef={monthScrollRef}
                        color="secondary"
                    />
                )}
            </CardContent>
        </Card>
    );
}
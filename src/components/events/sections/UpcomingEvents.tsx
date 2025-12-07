'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EventCarousel } from '@/components/events/sections/EventCarousel';
import { CarouselSkeleton } from '@/components/other/CarouselSkeleton';
import Link from 'next/link';

interface UpcomingEventsProps {
    userFavourites: Set<string>;
}

export function UpcomingEvents({ userFavourites }: UpcomingEventsProps) {
    const [thisWeekEvents, setThisWeekEvents] = useState<any[] | null>(null);
    const [thisMonthEvents, setThisMonthEvents] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading) {
        return (
            <CarouselSkeleton
                icon={<Calendar className="h-6 w-6 text-primary" />}
                borderClass="border-primary/20"
                gradientClass="from-primary/5"
            />
        );
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
        <div className="space-y-6">
            {hasWeek && (
                <EventCarousel
                    events={thisWeekEvents!}
                    userFavourites={userFavourites}
                    title="This Week"
                    icon={<Calendar className="h-6 w-6 text-primary" />}
                    source="homepage"
                    borderClass="border-primary/20"
                    gradientClass="from-primary/5"
                    autoScroll={true}
                    autoScrollInterval={5000}
                    showProgress={true}
                />
            )}

            {hasMonth && (
                <EventCarousel
                    events={thisMonthEvents!}
                    userFavourites={userFavourites}
                    title="Coming This Month"
                    icon={<Calendar className="h-6 w-6 text-primary" />}
                    source="homepage"
                    borderClass="border-secondary/20"
                    gradientClass="from-secondary/5"
                    autoScroll={true}
                    autoScrollInterval={5000}
                    showProgress={true}
                />
            )}
        </div>
    );
}
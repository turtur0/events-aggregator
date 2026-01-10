import { EventCard } from '../cards/EventCard';
import { EventCardSkeleton } from '@/components/events/cards/EventCardSkeleton';
import { EmptyState } from '@/components/other/EmptyState';
import { Pagination } from '@/components/other/Pagination';
import type { EventResponse } from '@/lib/transformers/event-transformer';

type EventSource = 'search' | 'recommendation' | 'category_browse' | 'homepage' | 'direct' | 'similar_events';

interface EventsGridProps {
    events: EventResponse[]; 
    totalEvents: number;
    totalPages: number;
    currentPage: number;
    userFavourites: Set<string>;
    source?: EventSource; 
    emptyTitle?: string;
    emptyDescription?: string;
    showCount?: boolean;
}

export function EventsGrid({
    events,
    totalEvents,
    totalPages,
    currentPage,
    userFavourites,
    source = 'direct',
    emptyTitle = 'No events found',
    emptyDescription = 'No events match your criteria. Try adjusting your filters.',
    showCount = true,
}: EventsGridProps) {
    if (events.length === 0) {
        return (
            <EmptyState
                title={emptyTitle}
                description={emptyDescription}
            />
        );
    }

    return (
        <>
            {/* Count */}
            {showCount && (
                <div className="mb-6">
                    <p className="text-sm text-muted-foreground">
                        {currentPage > 1 ? (
                            <>
                                Showing <strong className="text-foreground">{((currentPage - 1) * events.length) + 1}</strong> - <strong className="text-foreground">{Math.min(currentPage * events.length, totalEvents)}</strong> of{' '}
                            </>
                        ) : (
                            <>Found </>
                        )}
                        <strong className="text-foreground">{totalEvents.toLocaleString()}</strong> event{totalEvents !== 1 ? 's' : ''}
                    </p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        source={source}
                        initialFavourited={userFavourites.has(event.id)} 
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} />
            )}
        </>
    );
}

export { EventsGrid as default };

export function EventsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    );
}
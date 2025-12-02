// components/events/EventInfoSidebar.tsx
import { Calendar, MapPin, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { FavouriteButton } from '../cards/FavouriteButton';
import { BookingLink } from '../BookingLink';

interface EventInfoSidebarProps {
    eventId: string;
    isFavourited: boolean;
    dateText: string;
    timeText: string;
    duration?: string;
    venueName: string;
    venueSuburb: string;
    priceText: string;
    priceDetails?: string;
    bookingUrl: string;
    alternativeBookings?: { source: string; url: string }[];
    className?: string;
}

export function EventInfoSidebar({
    eventId,
    isFavourited,
    dateText,
    timeText,
    duration,
    venueName,
    venueSuburb,
    priceText,
    priceDetails,
    bookingUrl,
    alternativeBookings = [],
    className
}: EventInfoSidebarProps) {
    return (
        <Card className={`border-2 border-border/50 shadow-lg ${className}`}>
            <CardContent className="p-4 sm:p-6">
                {/* Date & Time */}
                <div className="mb-4">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="font-semibold mb-1 text-sm">Date & Time</p>
                            <p className="text-sm text-muted-foreground">{dateText}</p>
                            {timeText && <p className="text-sm text-muted-foreground">{timeText}</p>}
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Duration */}
                {duration && (
                    <>
                        <div className="mb-4">
                            <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-secondary mt-0.5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold mb-1 text-sm">Duration</p>
                                    <p className="text-sm text-muted-foreground">{duration}</p>
                                </div>
                            </div>
                        </div>
                        <Separator className="my-4" />
                    </>
                )}

                {/* Location */}
                <div className="mb-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="font-semibold mb-1 text-sm">Location</p>
                            <p className="text-sm text-muted-foreground">{venueName}</p>
                            <p className="text-sm text-muted-foreground">{venueSuburb}</p>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-secondary mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="w-full">
                            <p className="font-semibold mb-1 text-sm">Price</p>
                            <p className="text-sm text-muted-foreground mb-2">{priceText}</p>
                            {priceDetails && (
                                <p className="text-xs text-muted-foreground">{priceDetails}</p>
                            )}
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="space-y-3">
                    <FavouriteButton
                        eventId={eventId}
                        initialFavourited={isFavourited}
                        source="direct"
                        variant="button"
                        className="w-full"
                    />

                    <BookingLink eventId={eventId} href={bookingUrl} className="w-full">
                        Get Tickets
                    </BookingLink>

                    {/* Alternative Booking Sources */}
                    {alternativeBookings.length > 0 && (
                        <div className="pt-2 space-y-2">
                            <p className="text-xs text-muted-foreground text-centre">
                                Also available on:
                            </p>
                            {alternativeBookings.map(({ source, url }) => (
                                <BookingLink
                                    key={source}
                                    eventId={eventId}
                                    href={url}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    {source.charAt(0).toUpperCase() + source.slice(1)}
                                </BookingLink>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground text-centre pt-2">
                        You'll be redirected to the official ticketing site
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
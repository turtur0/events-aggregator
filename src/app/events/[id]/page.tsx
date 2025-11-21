import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, DollarSign, ExternalLink, ArrowLeft, Users, Clock, Video, Info } from "lucide-react";
import { connectDB } from "@/app/lib/db";
import Event from "@/app/lib/models/Event";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format, isSameMonth } from "date-fns";
import { getCategoryLabel } from "@/app/lib/categories";

interface EventPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findById(id).lean();

    if (!event) {
        return {
            title: "Event Not Found",
        };
    }

    return {
        title: `${event.title} | Melbourne Events`,
        description: event.description.substring(0, 160),
    };
}

export default async function EventPage({ params }: EventPageProps) {
    const { id } = await params;
    await connectDB();

    const eventDoc = await Event.findById(id).lean();

    if (!eventDoc) {
        notFound();
    }

    // Helper to convert Map to object
    const mapToObject = (map: any) => {
        if (!map) return {};
        if (typeof map.get === 'function') {
            const obj: Record<string, any> = {};
            for (const [key, value] of map) {
                obj[key] = value;
            }
            return obj;
        }
        return map;
    };

    // Serialize dates for client components
    const event = {
        ...eventDoc,
        _id: eventDoc._id.toString(),
        startDate: eventDoc.startDate.toISOString(),
        endDate: eventDoc.endDate?.toISOString(),
        scrapedAt: eventDoc.scrapedAt.toISOString(),
        lastUpdated: eventDoc.lastUpdated.toISOString(),
        sourceIds: mapToObject(eventDoc.sourceIds),
        bookingUrls: mapToObject(eventDoc.bookingUrls),
    };

    const formatDate = () => {
        try {
            const start = new Date(event.startDate);

            if (!event.endDate) {
                return format(start, "EEEE, MMMM d, yyyy");
            }

            const end = new Date(event.endDate);

            if (isSameMonth(start, end)) {
                return `${format(start, "EEEE, MMMM d")} - ${format(end, "d, yyyy")}`;
            }

            return `${format(start, "MMMM d")} - ${format(end, "MMMM d, yyyy")}`;

        } catch {
            return "Date TBA";
        }
    };

    const formatTime = () => {
        try {
            const start = new Date(event.startDate);
            const startTime = format(start, "h:mm a");

            if (event.endDate) {
                return `Starts ${startTime} daily`;
            }

            return startTime;
        } catch {
            return "";
        }
    };

    const formatPrice = () => {
        if (event.isFree) return "Free Entry";
        if (event.priceMin && event.priceMax) {
            return `$${event.priceMin} - $${event.priceMax}`;
        }
        if (event.priceMin) return `From $${event.priceMin}`;
        return "Check booking link for pricing";
    };

    // Get all booking URLs
    const bookingUrls = event.bookingUrls || {};
    const hasMultipleSources = event.sources && event.sources.length > 1;

    return (
        <>
            <main className="container py-8">
                {/* Back Button */}
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Events
                    </Link>
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-2">
                        {/* Event Image */}
                        {event.imageUrl && (
                            <div className="relative h-96 w-full rounded-lg overflow-hidden mb-6">
                                <Image
                                    src={event.imageUrl}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        )}

                        {/* Title & Category */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <Badge variant="secondary">
                                    {getCategoryLabel(event.category)}
                                </Badge>
                                {event.subcategories?.map((sub) => (
                                    <Badge key={sub} variant="outline">
                                        {sub}
                                    </Badge>
                                ))}
                                {event.endDate && (
                                    <Badge variant="outline">
                                        Multi-day Event
                                    </Badge>
                                )}
                                {event.ageRestriction && (
                                    <Badge variant="destructive">
                                        {event.ageRestriction}
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <p>
                                    Primary source: {event.primarySource.charAt(0).toUpperCase() + event.primarySource.slice(1)}
                                </p>
                                {hasMultipleSources && (
                                    <>
                                        <span>•</span>
                                        <p>{event.sources.length} sources</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Description */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>

                        {/* Video */}
                        {event.videoUrl && (
                            <>
                                <Separator className="my-6" />
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                        <Video className="h-6 w-6" />
                                        Preview
                                    </h2>
                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                        <iframe
                                            src={event.videoUrl}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Accessibility */}
                        {event.accessibility && event.accessibility.length > 0 && (
                            <>
                                <Separator className="my-6" />
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                        <Users className="h-6 w-6" />
                                        Accessibility
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {event.accessibility.map((feature) => (
                                            <Badge key={feature} variant="secondary">
                                                {feature}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator className="my-6" />

                        {/* Venue Details */}
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Venue</h2>
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-bold text-lg mb-2">{event.venue.name}</h3>
                                    <p className="text-muted-foreground mb-1">{event.venue.address}</p>
                                    <p className="text-muted-foreground">{event.venue.suburb}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Multiple Sources Info */}
                        {hasMultipleSources && (
                            <>
                                <Separator className="my-6" />
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Info className="h-5 w-5" />
                                            Event Information Sources
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            This event has been verified across multiple sources for accuracy.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {event.sources.map((source: string) => (
                                                <Badge key={source} variant="outline">
                                                    {source.charAt(0).toUpperCase() + source.slice(1)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-20">
                            <CardContent className="p-6">
                                {/* Date & Time */}
                                <div className="mb-6">
                                    <div className="flex items-start gap-3 mb-2">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="font-semibold mb-1">Date & Time</p>
                                            <p className="text-sm text-muted-foreground">{formatDate()}</p>
                                            {formatTime() && (
                                                <p className="text-sm text-muted-foreground">{formatTime()}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Duration */}
                                {event.duration && (
                                    <>
                                        <div className="mb-6">
                                            <div className="flex items-start gap-3">
                                                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-semibold mb-1">Duration</p>
                                                    <p className="text-sm text-muted-foreground">{event.duration}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Separator className="my-4" />
                                    </>
                                )}

                                {/* Location */}
                                <div className="mb-6">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="font-semibold mb-1">Location</p>
                                            <p className="text-sm text-muted-foreground">
                                                {event.venue.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {event.venue.suburb}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-start gap-3">
                                        <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div className="w-full">
                                            <p className="font-semibold mb-1">Price</p>
                                            <p className="text-sm text-muted-foreground mb-2">{formatPrice()}</p>
                                            {event.priceDetails && (
                                                <p className="text-xs text-muted-foreground">
                                                    {event.priceDetails}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Primary Booking Button */}
                                <Button asChild className="w-full" size="lg">
                                    <a
                                        href={event.bookingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Get Tickets
                                        <ExternalLink className="h-4 w-4 ml-2" />
                                    </a>
                                </Button>

                                {/* Additional booking links */}
                                {hasMultipleSources && Object.keys(bookingUrls).length > 1 && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-xs text-muted-foreground text-center">
                                            Also available on:
                                        </p>
                                        {Object.entries(bookingUrls).map(([source, url]) => {
                                            if (source === event.primarySource) return null;
                                            return (
                                                <Button
                                                    key={source}
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <a
                                                        href={url as string}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {source.charAt(0).toUpperCase() + source.slice(1)}
                                                        <ExternalLink className="h-3 w-3 ml-2" />
                                                    </a>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground text-center mt-4">
                                    You'll be redirected to the official ticketing site
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main >
        </>
    );
}
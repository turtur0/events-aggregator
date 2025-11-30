import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, DollarSign, Users, Clock } from "lucide-react";
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FavouriteButton } from './FavouriteButton';
import { SerializedEvent } from "@/lib/models/Event";
import { format, isSameDay, isSameMonth } from "date-fns";
import { getCategoryLabel } from "@/lib/constants/categories";

interface EventCardProps {
  event: SerializedEvent;
  source?: 'search' | 'recommendation' | 'category_browse' | 'homepage' | 'direct' | 'similar_events';
  initialFavourited?: boolean;
}

// Modern category color mapping with subtle backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  music: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/30",
  theatre: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30",
  sports: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30",
  arts: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30",
  family: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  other: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30",
};

export function EventCard({ event, source = 'direct', initialFavourited = false }: EventCardProps) {
  const formatPrice = () => {
    if (event.isFree) return "Free";
    if (event.priceMin && event.priceMax) {
      return `$${event.priceMin} - $${event.priceMax}`;
    }
    if (event.priceMin) return `From $${event.priceMin}`;
    return "Check website";
  };

  const formatDate = () => {
    try {
      const start = new Date(event.startDate);

      if (!event.endDate) {
        return format(start, "EEE, MMM d, yyyy");
      }

      const end = new Date(event.endDate);

      if (isSameDay(start, end)) {
        return format(start, "EEE, MMM d, yyyy");
      }

      if (isSameMonth(start, end)) {
        return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
      }

      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;

    } catch {
      return "Date TBA";
    }
  };

  const displaySubcategories = event.subcategories?.slice(0, 2) || [];
  const categoryColorClass = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

  return (
    <Card className="group overflow-hidden border-2 border-border/50 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] transition-all duration-300 hover:-translate-y-1">
      <Link href={`/events/${event._id}`}>
        {/* Event Image */}
        <div className="relative h-48 w-full bg-muted overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Calendar className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Favourite Button */}
          <div className="absolute top-2 left-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
            <FavouriteButton
              eventId={event._id}
              initialFavourited={initialFavourited}
              source={source}
            />
          </div>

          {/* Top right badges - modern styling with glow on hover */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {event.endDate && (
              <Badge 
                variant="secondary" 
                className="bg-background/90 backdrop-blur-sm border border-border/60 text-foreground shadow-sm transition-all hover:shadow-[0_0_10px_rgba(var(--foreground-rgb),0.2)] hover:scale-105"
              >
                Multi-day
              </Badge>
            )}
            {event.sources && event.sources.length > 1 && (
              <Badge 
                variant="secondary" 
                className="bg-background/90 backdrop-blur-sm border border-border/60 text-foreground shadow-sm transition-all hover:shadow-[0_0_10px_rgba(var(--foreground-rgb),0.2)] hover:scale-105"
              >
                {event.sources.length} sources
              </Badge>
            )}
          </div>

          {/* Age restriction badge with glow */}
          {event.ageRestriction && (
            <div className="absolute bottom-2 left-2">
              <Badge 
                variant="destructive" 
                className="bg-destructive/90 backdrop-blur-sm border border-destructive/50 shadow-sm transition-all hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] hover:scale-105"
              >
                {event.ageRestriction}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Category Badges - cleaner styling with glow on hover */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <Badge className={`${categoryColorClass} transition-all font-medium hover:shadow-[0_0_12px_currentColor] hover:scale-105 hover:bg-transparent`}>
              {getCategoryLabel(event.category)}
            </Badge>
            {displaySubcategories.map((sub) => (
              <Badge 
                key={sub} 
                variant="outline" 
                className="bg-muted/50 border-border/60 text-foreground transition-all hover:shadow-[0_0_8px_rgba(var(--foreground-rgb),0.3)] hover:scale-105"
              >
                {sub}
              </Badge>
            ))}
            {event.subcategories && event.subcategories.length > 2 && (
              <Badge 
                variant="outline" 
                className="bg-muted/50 border-border/60 text-foreground transition-all hover:shadow-[0_0_8px_rgba(var(--foreground-rgb),0.3)] hover:scale-105"
              >
                +{event.subcategories.length - 2}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 group-hover:text-foreground transition-colors">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{formatDate()}</span>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 group-hover:text-foreground transition-colors">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{event.venue.name}</span>
          </div>

          {/* Duration */}
          {event.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 group-hover:text-foreground transition-colors">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{event.duration}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="h-4 w-4 shrink-0 text-secondary" />
            <span>{formatPrice()}</span>
          </div>

          {/* Accessibility indicator */}
          {event.accessibility && event.accessibility.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Users className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="line-clamp-1">Accessible venue</span>
            </div>
          )}
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0">
        <Button
          asChild
          variant="outline"
          className="w-full border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all group"
        >
          <Link href={`/events/${event._id}`} className="flex items-center justify-center">
            <span className="text-foreground group-hover:text-primary transition-colors">View Details</span>
            <span className="ml-2 group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
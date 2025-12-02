// components/events/cards/EventBadge.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type BadgeType = 'category' | 'subcategory' | 'venue' | 'accessibility' | 'multiday' | 'sources' | 'age' | 'outline';

interface EventBadgeProps {
    type: BadgeType;
    label: string;
    href?: string;
    category?: string;
    subcategory?: string;
    venueBookingUrl?: string;
    className?: string;
}

const BADGE_STYLES: Record<BadgeType, string> = {
    category: '', // Handled by category-specific classes
    subcategory: 'bg-muted/50 border-border/60 text-foreground hover:shadow-[0_0_8px_rgba(var(--foreground-rgb),0.3)] hover:scale-105',
    venue: 'bg-secondary/10 text-secondary border-secondary/30 hover:shadow-[0_0_10px_currentColor] hover:scale-105',
    accessibility: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 cursor-default',
    multiday: 'bg-background/90 backdrop-blur-sm border border-border/60 text-foreground hover:shadow-[0_0_10px_rgba(var(--foreground-rgb),0.2)] hover:scale-105',
    sources: 'bg-background/90 backdrop-blur-sm border border-border/60 text-foreground cursor-default',
    age: 'bg-destructive/90 backdrop-blur-sm border border-destructive/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] hover:scale-105',
    outline: 'badge-outline-hover',
};

const CATEGORY_STYLES: Record<string, string> = {
    music: 'category-music',
    theatre: 'category-theatre',
    sports: 'category-sports',
    arts: 'category-arts',
    family: 'category-family',
    other: 'category-other',
};

export function EventBadge({
    type,
    label,
    href,
    category,
    subcategory,
    venueBookingUrl,
    className
}: EventBadgeProps) {
    const router = useRouter();

    const baseStyles = type === 'category' && category
        ? CATEGORY_STYLES[category] || CATEGORY_STYLES.other
        : BADGE_STYLES[type];

    // Non-interactive badge types
    const isInteractive = type !== 'accessibility' && type !== 'sources';
    const transitionClass = 'transition-all duration-300';

    // Determine the navigation target
    const getNavigationUrl = (): string | null => {
        // Explicit href takes priority
        if (href) return href;

        // Subcategory badge: link to search with subcategory filter
        if (type === 'subcategory' && subcategory && category) {
            return `/?category=${category}&subcategory=${encodeURIComponent(subcategory)}`;
        }

        // Venue badge: link to the venue's booking URL
        if (type === 'venue' && venueBookingUrl) {
            return venueBookingUrl;
        }

        return null;
    };

    // Handle click for badges with navigation
    const handleClick = (e: React.MouseEvent) => {
        const navigationUrl = getNavigationUrl();

        if (navigationUrl && isInteractive) {
            e.preventDefault();
            e.stopPropagation();

            // External links (venue bookings, category pages starting with http) open in new tab
            if (navigationUrl.startsWith('http')) {
                window.open(navigationUrl, '_blank', 'noopener,noreferrer');
            } else {
                // Internal navigation
                router.push(navigationUrl);
            }
        }
    };

    const hasNavigation = getNavigationUrl() !== null;

    return (
        <Badge
            variant={type === 'age' ? 'destructive' : type === 'outline' ? 'outline' : 'secondary'}
            className={cn(
                baseStyles,
                transitionClass,
                'font-medium',
                !isInteractive && 'cursor-default hover:scale-100',
                hasNavigation && isInteractive && 'cursor-pointer',
                className
            )}
            onClick={handleClick}
        >
            {label}
        </Badge>
    );
}
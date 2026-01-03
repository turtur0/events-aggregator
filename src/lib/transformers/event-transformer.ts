/**
 * Event data transformation layer
 * Converts database models to consistent API response formats
 */

export interface EventResponse {
    id: string;
    title: string;
    description: string;
    category: string;
    subcategories: string[];

    schedule: {
        start: string;
        end: string | null;
    };

    venue: {
        name: string;
        location: string;
        capacity?: number;
        tier?: number;
    };

    pricing: {
        min?: number;
        max?: number;
        isFree: boolean;
    };

    booking: {
        url: string;
        source: string;
    };

    media: {
        imageUrl: string | null;
    };

    engagement: {
        views: number;
        favourites: number;
        clicks: number;
    };

    // Additional fields needed by EventCard
    duration?: string;
    ageRestriction?: string;
    accessibility?: string[];
    sources?: string[];
}

export interface RecommendationResponse extends EventResponse {
    recommendation: {
        score: number;
        reason: string;
    };
}

/**
 * Transforms database event model to API response format
 */
export function transformEvent(event: any): EventResponse {
    // Ensure dates are valid
    const startDate = event.startDate ? new Date(event.startDate) : new Date();
    const endDate = event.endDate ? new Date(event.endDate) : null;

    return {
        id: event._id.toString(),
        title: event.title || 'Untitled Event',
        description: event.description || '',
        category: event.category || 'other',
        subcategories: event.subcategories || [],

        schedule: {
            start: startDate.toISOString(),
            end: endDate?.toISOString() || null,
        },

        venue: {
            name: event.venue?.name || 'TBA',
            location: event.venue?.location || 'Melbourne',
            capacity: event.venue?.capacity,
            tier: event.venue?.tier,
        },

        pricing: {
            min: event.priceMin,
            max: event.priceMax,
            isFree: event.isFree || false,
        },

        booking: {
            url: event.bookingUrl || '',
            source: event.primarySource || 'website',
        },

        media: {
            imageUrl: event.imageUrl || null,
        },

        engagement: {
            views: event.stats?.viewCount || 0,
            favourites: event.stats?.favouriteCount || 0,
            clicks: event.stats?.clickthroughCount || 0,
        },

        // Additional fields
        duration: event.duration,
        ageRestriction: event.ageRestriction,
        accessibility: event.accessibility || [],
        sources: event.sources || [],
    };
}

/**
 * Transforms event with recommendation metadata
 */
export function transformRecommendation(
    event: any,
    score: number,
    reason: string
): RecommendationResponse {
    return {
        ...transformEvent(event),
        recommendation: {
            score,
            reason,
        },
    };
}

/**
 * Serialises raw event data (handles both Mongoose docs and plain objects)
 */
export function serialiseEvent(event: any): EventResponse {
    // Helper to safely convert dates
    const toISOString = (date: any): string => {
        if (!date) return new Date().toISOString();
        return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    };

    return {
        id: event._id.toString(),
        title: event.title || 'Untitled Event',
        description: event.description || '',
        category: event.category || 'other',
        subcategories: event.subcategories || [],

        schedule: {
            start: toISOString(event.startDate),
            end: event.endDate ? toISOString(event.endDate) : null,
        },

        venue: {
            name: event.venue?.name || 'TBA',
            location: event.venue?.location || 'Melbourne',
            capacity: event.venue?.capacity,
            tier: event.venue?.tier,
        },

        pricing: {
            min: event.priceMin,
            max: event.priceMax,
            isFree: event.isFree || false,
        },

        booking: {
            url: event.bookingUrl || '',
            source: event.primarySource || 'website',
        },

        media: {
            imageUrl: event.imageUrl || null,
        },

        engagement: {
            views: event.stats?.viewCount || 0,
            favourites: event.stats?.favouriteCount || 0,
            clicks: event.stats?.clickthroughCount || 0,
        },

        duration: event.duration,
        ageRestriction: event.ageRestriction,
        accessibility: event.accessibility || [],
        sources: event.sources || [],
    };
}
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

    pricing: {
        range: {
            min: number;
            max: number;
        } | null;
        isFree: boolean;
    };

    venue: {
        name: string;
        location: string;
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
}

export interface RecommendationResponse extends EventResponse {
    recommendation: {
        score: number;
        reason: string;
    };
}
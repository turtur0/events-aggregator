
// lib/constants/preferences.ts
import { Search, Target, TrendingUp } from 'lucide-react';

export const POPULARITY_OPTIONS = [
    {
        value: 0,
        label: 'Hidden Gems',
        icon: Search,
        description: 'Indie venues, emerging artists, unique experiences',
        shortDesc: 'Niche and unique'
    },
    {
        value: 0.5,
        label: 'Balanced',
        icon: Target,
        description: 'Mix of popular and unique events',
        shortDesc: 'Mix of both'
    },
    {
        value: 1,
        label: 'Mainstream',
        icon: TrendingUp,
        description: 'Major venues, well-known acts, popular events',
        shortDesc: 'Popular and trending'
    },
] as const;

// Helper to get closest option for a given value
export function getPopularityOption(value: number) {
    const distances = POPULARITY_OPTIONS.map(opt => ({
        option: opt,
        distance: Math.abs(opt.value - value)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    return distances[0].option;
}

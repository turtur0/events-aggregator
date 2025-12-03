import { Search, Target, TrendingUp, Minimize2, Grid3x3, Maximize2 } from 'lucide-react';

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

// Email digest recommendations per category
export const DIGEST_RECOMMENDATIONS_OPTIONS = [
    {
        value: 'minimal',
        label: 'Minimal',
        icon: Minimize2,
        description: 'Just the highlights',
        count: 3,
    },
    {
        value: 'moderate',
        label: 'Moderate',
        icon: Grid3x3,
        description: 'Balanced selection',
        count: 5,
    },
    {
        value: 'comprehensive',
        label: 'Comprehensive',
        icon: Maximize2,
        description: 'All the details',
        count: 10,
    },
    {
        value: 'custom',
        label: 'Custom',
        icon: Target,
        description: 'Set your own limit',
        count: 5,
    }
] as const;

export type DigestRecommendationsSize = typeof DIGEST_RECOMMENDATIONS_OPTIONS[number]['value'];

// Helper to get recommendations count for a given size
export function getRecommendationsCount(size: DigestRecommendationsSize, customCount?: number): number {
    if (size === 'custom' && customCount !== undefined) {
        return customCount;
    }
    
    const option = DIGEST_RECOMMENDATIONS_OPTIONS.find(opt => opt.value === size);
    return option?.count || 5; // Default to moderate
}

// Helper to get closest option for a given value
export function getPopularityOption(value: number) {
    const distances = POPULARITY_OPTIONS.map(opt => ({
        option: opt,
        distance: Math.abs(opt.value - value)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    return distances[0].option;
}
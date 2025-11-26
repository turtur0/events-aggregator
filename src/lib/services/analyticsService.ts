// lib/services/analyticsService.ts - Fixed filtering logic

import Event from '@/lib/models/Event';
import { CATEGORIES } from '@/lib/constants/categories';

export interface PriceDistribution {
    category: string;
    displayName: string;
    count: number;
    min: number;
    max: number;
    avgPrice: number;
    median: number;
    q1: number;
    q3: number;
    isSubcategory: boolean;
}

export interface TimelineData {
    month: string;
    total: number;
    [category: string]: number | string;
}

export interface PopularityData {
    title: string;
    category: string;
    priceMin: number;
    popularity: number;
    favourites: number;
}

/**
 * Build MongoDB query filter based on selected categories/subcategories
 */
function buildCategoryFilter(selectedCategories?: string[]) {
    if (!selectedCategories || selectedCategories.length === 0) {
        return {};
    }

    // Separate main categories from subcategories
    const mainCategories: string[] = [];
    const subcategories: string[] = [];

    selectedCategories.forEach(cat => {
        const isSubcategory = CATEGORIES.some(mainCat => 
            mainCat.subcategories?.includes(cat)
        );

        if (isSubcategory) {
            subcategories.push(cat);
        } else {
            mainCategories.push(cat);
        }
    });

    // Build OR conditions
    const conditions: any[] = [];

    if (mainCategories.length > 0) {
        conditions.push({ category: { $in: mainCategories } });
    }

    if (subcategories.length > 0) {
        conditions.push({ subcategories: { $in: subcategories } });
    }

    return conditions.length > 0 ? { $or: conditions } : {};
}

/**
 * Check if an event matches the selected categories
 */
function matchesCategories(event: any, selectedCategories?: string[]): boolean {
    if (!selectedCategories || selectedCategories.length === 0) {
        return true;
    }

    // Check main category
    if (selectedCategories.includes(event.category)) {
        return true;
    }

    // Check subcategories
    if (event.subcategories && Array.isArray(event.subcategories)) {
        return event.subcategories.some((sub: string) => selectedCategories.includes(sub));
    }

    return false;
}

/**
 * Compute price distribution with optional category filtering
 */
export async function computePriceDistribution(
    selectedCategories?: string[]
): Promise<PriceDistribution[]> {
    const now = new Date();
    const categoryFilter = buildCategoryFilter(selectedCategories);

    const events = await Event.find({
        startDate: { $gte: now },
        isFree: false,
        priceMin: { $exists: true, $gt: 0 },
        ...categoryFilter,
    })
        .select('category subcategories priceMin priceMax')
        .lean();

    if (events.length === 0) return [];

    // Group by category or subcategory
    const groups: Record<string, number[]> = {};

    events.forEach(event => {
        if (selectedCategories && selectedCategories.length > 0) {
            // Filter to only selected categories/subcategories
            const selectedSubs = event.subcategories?.filter(sub =>
                selectedCategories.includes(sub)
            ) || [];

            // Add to subcategory groups
            selectedSubs.forEach(sub => {
                if (!groups[sub]) groups[sub] = [];
                groups[sub].push(event.priceMin || 0);
            });

            // If main category is selected and no subcategories matched
            if (selectedCategories.includes(event.category) && selectedSubs.length === 0) {
                if (!groups[event.category]) groups[event.category] = [];
                groups[event.category].push(event.priceMin || 0);
            }
        } else {
            // No filter - group by main category
            if (!groups[event.category]) groups[event.category] = [];
            groups[event.category].push(event.priceMin || 0);
        }
    });

    // Calculate statistics for each group
    const result: PriceDistribution[] = [];

    for (const [categoryName, prices] of Object.entries(groups)) {
        if (prices.length === 0) continue;

        const sorted = prices.sort((a, b) => a - b);
        const count = sorted.length;

        const isSubcategory = CATEGORIES.some(cat =>
            cat.subcategories?.includes(categoryName)
        );

        result.push({
            category: categoryName,
            displayName: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
            count,
            min: Math.round(sorted[0]),
            max: Math.round(sorted[count - 1]),
            avgPrice: Math.round(prices.reduce((sum, p) => sum + p, 0) / count),
            median: Math.round(sorted[Math.floor(count / 2)]),
            q1: Math.round(sorted[Math.floor(count * 0.25)]),
            q3: Math.round(sorted[Math.floor(count * 0.75)]),
            isSubcategory,
        });
    }

    return result.sort((a, b) => b.count - a.count);
}

/**
 * Compute timeline with optional category filtering
 */
export async function computeTimeline(
    selectedCategories?: string[]
): Promise<TimelineData[]> {
    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const categoryFilter = buildCategoryFilter(selectedCategories);

    const events = await Event.find({
        startDate: { $gte: now, $lte: sixMonthsLater },
        ...categoryFilter,
    })
        .select('startDate category subcategories')
        .lean();

    // Group by month and category
    const monthGroups: Record<string, Record<string, number>> = {};

    events.forEach(event => {
        const monthKey = event.startDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        });

        if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = {};
        }

        // Always count by main category for timeline consistency
        const categoryKey = event.category;
        monthGroups[monthKey][categoryKey] = (monthGroups[monthKey][categoryKey] || 0) + 1;
    });

    // Convert to array format
    const result: TimelineData[] = Object.entries(monthGroups).map(([month, categories]) => {
        const row: TimelineData = {
            month,
            total: Object.values(categories).reduce((sum, count) => sum + count, 0),
        };

        // Add each category count
        Object.entries(categories).forEach(([cat, count]) => {
            row[cat] = count;
        });

        return row;
    });

    // Sort by date
    return result.sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Compute popularity data with optional category filtering
 */
export async function computePopularityData(
    selectedCategories?: string[]
): Promise<PopularityData[]> {
    const now = new Date();
    
    console.log('[Analytics] Computing popularity with filters:', selectedCategories);
    
    const categoryFilter = buildCategoryFilter(selectedCategories);
    
    console.log('[Analytics] Category filter:', JSON.stringify(categoryFilter));

    const events = await Event.find({
        startDate: { $gte: now },
        priceMin: { $exists: true, $gt: 0 },
        'stats.categoryPopularityPercentile': { $exists: true },
        ...categoryFilter,
    })
        .select('title category subcategories priceMin stats.categoryPopularityPercentile stats.favouriteCount')
        .limit(500)
        .lean();

    console.log('[Analytics] Found events:', events.length);
    
    // Additional filtering in case MongoDB query wasn't restrictive enough
    const filteredEvents = selectedCategories && selectedCategories.length > 0
        ? events.filter(event => matchesCategories(event, selectedCategories))
        : events;

    console.log('[Analytics] After client-side filtering:', filteredEvents.length);

    return filteredEvents.map(event => ({
        title: event.title,
        category: event.category,
        priceMin: event.priceMin || 0,
        popularity: event.stats?.categoryPopularityPercentile || 0,
        favourites: event.stats?.favouriteCount || 0,
    }));
}
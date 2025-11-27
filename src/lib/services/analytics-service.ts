import { CATEGORIES } from '@/lib/constants/categories';
import { Event } from '@/lib/models';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Statistical distribution of event prices within a category
 */
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

/**
 * Aggregated event counts by month and category
 */
export interface TimelineData {
    month: string;
    total: number;
    [category: string]: number | string;
}

/**
 * Event popularity metrics for scatter plot visualisations
 */
export interface PopularityData {
    title: string;
    category: string;
    priceMin: number;
    popularity: number;
    favourites: number;
}

// ============================================
// PRIVATE HELPERS
// ============================================

/**
 * Builds MongoDB query filter for category/subcategory selection
 * Separates main categories from subcategories and constructs appropriate $or conditions
 */
function buildCategoryFilter(selectedCategories?: string[]) {
    if (!selectedCategories?.length) return {};

    const mainCategories: string[] = [];
    const subcategories: string[] = [];

    // Classify each selection as main category or subcategory
    selectedCategories.forEach(cat => {
        const isSubcategory = CATEGORIES.some(mainCat =>
            mainCat.subcategories?.includes(cat)
        );
        (isSubcategory ? subcategories : mainCategories).push(cat);
    });

    // Build OR conditions for MongoDB query
    const conditions: any[] = [];
    if (mainCategories.length) conditions.push({ category: { $in: mainCategories } });
    if (subcategories.length) conditions.push({ subcategories: { $in: subcategories } });

    return conditions.length ? { $or: conditions } : {};
}

/**
 * Client-side filter to verify event matches selected categories
 * Used as fallback when MongoDB query may not be restrictive enough
 */
function matchesCategories(event: any, selectedCategories?: string[]): boolean {
    if (!selectedCategories?.length) return true;

    // Check main category match
    if (selectedCategories.includes(event.category)) return true;

    // Check subcategory matches
    if (Array.isArray(event.subcategories)) {
        return event.subcategories.some((sub: string) => selectedCategories.includes(sub));
    }

    return false;
}

/**
 * Calculates statistical measures for an array of prices
 */
function calculatePriceStats(prices: number[]) {
    const sorted = [...prices].sort((a, b) => a - b);
    const count = sorted.length;

    return {
        count,
        min: Math.round(sorted[0]),
        max: Math.round(sorted[count - 1]),
        avgPrice: Math.round(prices.reduce((sum, p) => sum + p, 0) / count),
        median: Math.round(sorted[Math.floor(count / 2)]),
        q1: Math.round(sorted[Math.floor(count * 0.25)]),
        q3: Math.round(sorted[Math.floor(count * 0.75)]),
    };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Computes price distribution statistics across categories
 * Groups events by category/subcategory and calculates quartiles, median, average
 * 
 * @param selectedCategories - Optional filter for specific categories
 * @returns Array of price distributions sorted by event count
 */
export async function computePriceDistribution(
    selectedCategories?: string[]
): Promise<PriceDistribution[]> {
    const now = new Date();
    const categoryFilter = buildCategoryFilter(selectedCategories);

    // Query upcoming paid events
    const events = await Event.find({
        startDate: { $gte: now },
        isFree: false,
        priceMin: { $exists: true, $gt: 0 },
        ...categoryFilter,
    })
        .select('category subcategories priceMin')
        .lean();

    if (!events.length) return [];

    // Group prices by category/subcategory
    const groups: Record<string, number[]> = {};

    events.forEach(event => {
        if (selectedCategories?.length) {
            // Filter mode: group by selected subcategories or main category
            const selectedSubs = event.subcategories?.filter(sub =>
                selectedCategories.includes(sub)
            ) || [];

            selectedSubs.forEach(sub => {
                (groups[sub] ??= []).push(event.priceMin || 0);
            });

            // Add to main category if selected and no subcategories matched
            if (selectedCategories.includes(event.category) && !selectedSubs.length) {
                (groups[event.category] ??= []).push(event.priceMin || 0);
            }
        } else {
            // Default mode: group by main category only
            (groups[event.category] ??= []).push(event.priceMin || 0);
        }
    });

    // Calculate statistics for each group
    const result: PriceDistribution[] = [];

    for (const [categoryName, prices] of Object.entries(groups)) {
        if (!prices.length) continue;

        const isSubcategory = CATEGORIES.some(cat =>
            cat.subcategories?.includes(categoryName)
        );

        result.push({
            category: categoryName,
            displayName: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
            isSubcategory,
            ...calculatePriceStats(prices),
        });
    }

    return result.sort((a, b) => b.count - a.count);
}

/**
 * Computes event timeline for the next 6 months
 * Aggregates events by month and category for trend visualisation
 * 
 * @param selectedCategories - Optional filter for specific categories
 * @returns Array of timeline data sorted chronologically
 */
export async function computeTimeline(
    selectedCategories?: string[]
): Promise<TimelineData[]> {
    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const categoryFilter = buildCategoryFilter(selectedCategories);

    // Query events in next 6 months
    const events = await Event.find({
        startDate: { $gte: now, $lte: sixMonthsLater },
        ...categoryFilter,
    })
        .select('startDate category')
        .lean();

    // Group by month and category
    const monthGroups: Record<string, Record<string, number>> = {};

    events.forEach(event => {
        const monthKey = event.startDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        });

        monthGroups[monthKey] ??= {};
        const categoryKey = event.category;
        monthGroups[monthKey][categoryKey] = (monthGroups[monthKey][categoryKey] || 0) + 1;
    });

    // Convert to array format
    const result: TimelineData[] = Object.entries(monthGroups).map(([month, categories]) => {
        const row: TimelineData = {
            month,
            total: Object.values(categories).reduce((sum, count) => sum + count, 0),
            ...categories,
        };
        return row;
    });

    // Sort chronologically
    return result.sort((a, b) =>
        new Date(a.month).getTime() - new Date(b.month).getTime()
    );
}

/**
 * Computes popularity data for scatter plot visualisation
 * Returns upcoming paid events with popularity percentiles
 * 
 * @param selectedCategories - Optional filter for specific categories
 * @returns Array of events with popularity metrics
 */
export async function computePopularityData(
    selectedCategories?: string[]
): Promise<PopularityData[]> {
    const now = new Date();
    const categoryFilter = buildCategoryFilter(selectedCategories);

    console.log('[Analytics] Computing popularity with filters:', selectedCategories);

    // Query upcoming paid events with popularity scores
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

    // Apply client-side filtering as fallback
    const filteredEvents = selectedCategories?.length
        ? events.filter(event => matchesCategories(event, selectedCategories))
        : events;

    console.log('[Analytics] After filtering:', filteredEvents.length);

    return filteredEvents.map(event => ({
        title: event.title,
        category: event.category,
        priceMin: event.priceMin || 0,
        popularity: event.stats?.categoryPopularityPercentile || 0,
        favourites: event.stats?.favouriteCount || 0,
    }));
}
// lib/services/analyticsService.ts
import Event from '@/lib/models/Event';
import { CATEGORIES } from '../constants/categories';

export interface PriceDistribution {
    category: string;
    displayName: string;
    isSubcategory: boolean;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    count: number;
    avgPrice: number;
}

export interface TimelineData {
    month: string;
    [category: string]: number | string;
    total: number;
}

export interface PopularityData {
    _id: string;
    title: string;
    category: string;
    priceMin: number;
    priceMax: number;
    popularity: number;
    favourites: number;
}

/**
 * Calculate price distribution statistics by category or subcategory
 * @param selectedCategories - Array of category values (e.g., ['music', 'Rock & Alternative'])
 */
export async function computePriceDistribution(
    selectedCategories?: string[]
): Promise<PriceDistribution[]> {
    const results: PriceDistribution[] = [];

    // If no selection, default to all main categories
    const categoriesToProcess = selectedCategories && selectedCategories.length > 0
        ? selectedCategories
        : CATEGORIES.map(c => c.value);

    for (const categoryOrSub of categoriesToProcess) {
        // Check if it's a main category
        const mainCategory = CATEGORIES.find(c => c.value === categoryOrSub);
        const isMainCategory = !!mainCategory;

        // Check if it's a subcategory
        let parentCategory: string | undefined;
        let isSubcategory = false;

        if (!isMainCategory) {
            for (const cat of CATEGORIES) {
                if (cat.subcategories?.includes(categoryOrSub)) {
                    parentCategory = cat.value;
                    isSubcategory = true;
                    break;
                }
            }
        }

        // Build query - RELAXED to include events without priceMin
        let query: any = {
            isFree: false
        };

        if (isMainCategory) {
            query.category = categoryOrSub;
        } else if (isSubcategory && parentCategory) {
            query.category = parentCategory;
            query.subcategories = categoryOrSub;
        } else {
            continue; // Invalid category
        }

        // Get events
        const events = await Event.find(query)
            .select('priceMin priceMax priceDetails')
            .lean();

        if (events.length === 0) {
            continue;
        }

        // Extract prices - try priceMin, priceMax, or parse from priceDetails
        const prices = events
            .map(e => {
                // Try priceMin first
                if (e.priceMin && e.priceMin > 0) return e.priceMin;

                // Try priceMax as fallback
                if (e.priceMax && e.priceMax > 0) return e.priceMax;

                // Try parsing from priceDetails (e.g., "$50-$100" or "From $75")
                if (e.priceDetails) {
                    const match = e.priceDetails.match(/\$(\d+)/);
                    if (match) return parseInt(match[1]);
                }

                return null;
            })
            .filter((p): p is number => p !== null && p > 0)
            .sort((a, b) => a - b);

        // Skip if no valid prices found
        if (prices.length === 0) {
            console.log(`[Analytics] No valid prices for ${categoryOrSub} (${events.length} events)`);
            continue;
        }

        const n = prices.length;
        const min = prices[0];
        const max = prices[n - 1];
        const median = n % 2 === 0
            ? (prices[n / 2 - 1] + prices[n / 2]) / 2
            : prices[Math.floor(n / 2)];
        const q1 = prices[Math.floor(n * 0.25)];
        const q3 = prices[Math.floor(n * 0.75)];
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / n;

        results.push({
            category: categoryOrSub,
            displayName: isMainCategory
                ? mainCategory!.label
                : categoryOrSub,
            isSubcategory,
            min,
            q1,
            median,
            q3,
            max,
            count: n,
            avgPrice: Math.round(avgPrice)
        });
    }

    return results;
}

/**
 * Calculate event counts over time by category
 */
export async function computeTimeline(): Promise<TimelineData[]> {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const events = await Event.aggregate([
        {
            $match: {
                startDate: {
                    $gte: new Date(),
                    $lte: sixMonthsFromNow
                }
            }
        },
        {
            $group: {
                _id: {
                    month: { $dateToString: { format: '%Y-%m', date: '$startDate' } },
                    category: '$category'
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.month': 1 }
        }
    ]);

    const timelineMap = new Map<string, TimelineData>();

    for (const item of events) {
        const month = item._id.month;
        const category = item._id.category;
        const count = item.count;

        if (!timelineMap.has(month)) {
            timelineMap.set(month, {
                month: formatMonth(month),
                total: 0
            });
        }

        const data = timelineMap.get(month)!;
        data[category] = count;
        data.total += count;
    }

    return Array.from(timelineMap.values());
}

/**
 * Get events for price vs popularity scatter plot
 */
export async function computePopularityData(): Promise<PopularityData[]> {
    const events = await Event.find({
        startDate: { $gte: new Date() },
        priceMin: { $exists: true, $gt: 0 },
        'stats.categoryPopularityPercentile': { $exists: true }
    })
        .select('title category priceMin priceMax stats.categoryPopularityPercentile stats.favouriteCount')
        .limit(200)
        .lean();

    return events.map(e => ({
        _id: e._id.toString(),
        title: e.title,
        category: e.category,
        priceMin: e.priceMin || 0,
        priceMax: e.priceMax || e.priceMin || 0,
        popularity: e.stats?.categoryPopularityPercentile || 0,
        favourites: e.stats?.favouriteCount || 0
    }));
}

function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
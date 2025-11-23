import Event from '@/lib/models/Event';
import UserInteraction from '@/lib/models/UserInteraction';
import { extractEventFeatures, cosineSimilarity } from './vectorService';
import mongoose from 'mongoose';
import type { IEvent } from '@/lib/models/Event';
import { CATEGORIES } from '../categories';

// ============================================
// PUBLIC RECOMMENDATIONS (No Auth Required)
// ============================================

/**
 * Get trending/popular events (for unauthenticated users)
 * Based on view count, favorite count, and recency
 */
export async function getTrendingEvents(options: {
    limit?: number;
    category?: string;
    minDate?: Date;
} = {}) {
    const { limit = 20, category, minDate = new Date() } = options;

    const query: any = { startDate: { $gte: minDate } };
    if (category) query.category = category;

    const events = await Event.find(query)
        .sort({
            'stats.favoriteCount': -1,
            'stats.viewCount': -1,
            startDate: 1,
        })
        .limit(limit)
        .lean();

    return events;
}

/**
 * Get similar events to a specific event (works for everyone)
 */
export async function getSimilarEvents(
    eventId: mongoose.Types.ObjectId,
    options: { limit?: number } = {}
) {
    const { limit = 6 } = options;

    const targetEvent = await Event.findById(eventId).lean();
    if (!targetEvent) return [];

    const targetVector = extractEventFeatures(targetEvent);

    // Find similar events in same category
    const candidates = await Event.find({
        category: targetEvent.category,
        startDate: { $gte: new Date() },
        _id: { $ne: eventId },
    })
        .limit(50)
        .lean();

    // Score by similarity
    const scored = candidates.map(event => ({
        event,
        similarity: cosineSimilarity(
            targetVector.fullVector,
            extractEventFeatures(event).fullVector
        ),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
}

// ============================================
// PERSONALIZED RECOMMENDATIONS (Auth Required)
// ============================================

/**
 * Get personalized recommendations for authenticated user
 * Combines user profile with popularity signals
 */
export async function getPersonalizedRecommendations(
    userId: mongoose.Types.ObjectId,
    user: any,
    options: {
        limit?: number;
        category?: string;
        excludeFavorited?: boolean;
    } = {}
) {
    const { limit = 20, category, excludeFavorited = true } = options;

    // Build simple user preference vector from selections
    const userPreferences = buildSimpleUserVector(user);

    // Get candidate events
    const query: any = { startDate: { $gte: new Date() } };
    if (category) query.category = category;
    if (user.preferences?.locations?.length) {
        query['venue.suburb'] = { $in: user.preferences.locations };
    }

    let events = await Event.find(query)
        .limit(200)
        .lean();

    // Exclude favorited events if requested
    if (excludeFavorited) {
        const favorited = await UserInteraction.find({
            userId,
            interactionType: 'favourite',
        }).select('eventId');

        const favIds = new Set(favorited.map(f => f.eventId.toString()));
        events = events.filter(e => !favIds.has(e._id.toString()));
    }

    // Score each event
    const scored = events.map(event => {
        const eventVector = extractEventFeatures(event);
        const contentMatch = cosineSimilarity(userPreferences, eventVector.fullVector);

        // Popularity boost
        const popularity = (event.stats?.favouriteCount || 0) / 100;

        // Combined score
        const score = contentMatch * 0.7 + (popularity * 0.3);

        return {
            event,
            score,
            reason: generateReason(event, user, contentMatch),
        };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => ({
        event: item.event,
        score: item.score,
        explanation: { reason: item.reason },
    }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build a simple user preference vector from explicit selections
 */
function buildSimpleUserVector(user: any): number[] {
    const vector: number[] = [];

    // 1. Category weights (6 dimensions) - WEIGHTED
    const categoryWeights = user.preferences?.categoryWeights || {};
    const categories = ['music', 'theatre', 'sports', 'arts', 'family', 'other'];

    for (const cat of categories) {
        // Apply same weighting as events (FEATURE_WEIGHTS.category = 10.0)
        vector.push((categoryWeights[cat] || 0.5) * 10.0);
    }

    // 2. Subcategory vector - must match ALL_SUBCATEGORIES length
    const ALL_SUBCATEGORIES = CATEGORIES.flatMap(cat =>
        (cat.subcategories || []).map(sub => `${cat.value}:${sub}`)
    );

    // For user preferences, we can't encode specific subcategories easily,
    // so we'll use a neutral approach: slight preference for user's favorite categories
    for (const fullSubcat of ALL_SUBCATEGORIES) {
        const [category] = fullSubcat.split(':');
        const categoryWeight = categoryWeights[category] || 0.5;

        // Apply same weighting as events (FEATURE_WEIGHTS.subcategory = 5.0)
        // Scale down since user doesn't have specific subcategory prefs
        vector.push(categoryWeight * 2.0);
    }

    // 3. Price preference (1 dimension) - WEIGHTED
    const pricePref = user.preferences?.pricePreference || 0.5;
    vector.push(pricePref * 1.0); // FEATURE_WEIGHTS.price = 1.0

    // 4. Venue tier preference (1 dimension) - WEIGHTED
    const venuePref = user.preferences?.venuePreference || 0.5;
    vector.push(venuePref * 1.0); // FEATURE_WEIGHTS.venue = 1.0

    // 5. Popularity preference (1 dimension) - WEIGHTED
    const popPref = user.preferences?.popularityPreference || 0.5;
    vector.push(popPref * 3.0); // FEATURE_WEIGHTS.popularity = 3.0

    return vector;
}

/**
 * Generate human-readable explanation
 */
function generateReason(
    event: IEvent,
    user: any,
    similarity: number
): string {
    if (similarity > 0.8) {
        return `Strong match with your preferences`;
    }
    if (similarity > 0.6) {
        return `Matches your interests`;
    }
    if ((event.stats?.favouriteCount || 0) > 50) {
        return `Popular in ${event.category}`;
    }
    return `Recommended for you`;
}
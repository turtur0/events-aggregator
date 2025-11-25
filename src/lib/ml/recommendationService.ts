// lib/ml/recommendationService.ts
import Event from '@/lib/models/Event';
import UserInteraction from '@/lib/models/UserInteraction';
import { extractEventFeatures, cosineSimilarity } from './vectorService';
import mongoose from 'mongoose';
import type { IEvent } from '@/lib/models/Event';
import { CATEGORIES } from '../constants/categories';

// ============================================
// PUBLIC RECOMMENDATIONS
// ============================================

/**
 * Get trending events - purely based on user engagement
 * High engagement + velocity + recency = trending
 */
export async function getTrendingEvents(options: {
    limit?: number;
    category?: string;
    minDate?: Date;
} = {}) {
    const { limit = 20, category, minDate = new Date() } = options;

    const query: any = {
        startDate: { $gte: minDate },
        // Must have SOME engagement to be "trending"
        // Lowered thresholds for early-stage app
        $or: [
            { 'stats.favouriteCount': { $gte: 1 } },
            { 'stats.clickthroughCount': { $gte: 1 } },
            { 'stats.viewCount': { $gte: 5 } }
        ]
    };
    if (category) query.category = category;

    const events = await Event.find(query).limit(200).lean();

    // Score by engagement + velocity
    const scored = events.map(event => ({
        event,
        score: calculateTrendingScore(event),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.event);
}

/**
 * Calculate trending score - engagement-focused
 */
function calculateTrendingScore(event: IEvent): number {
    const { viewCount = 0, favouriteCount = 0, clickthroughCount = 0 } = event.stats || {};

    // Weighted engagement
    const totalEngagement = viewCount * 0.1 + favouriteCount * 5 + clickthroughCount * 3;

    // Velocity (engagement per day since listing)
    const daysSinceListed = Math.max(1, (Date.now() - event.scrapedAt.getTime()) / (1000 * 60 * 60 * 24));
    const velocity = totalEngagement / daysSinceListed;

    // Recency bonus (events happening soon)
    const daysUntilEvent = (event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0.5, 1 - (daysUntilEvent / 90));

    // Category popularity percentile
    const popularity = event.stats?.categoryPopularityPercentile ?? 0.5;

    // Combined score: engagement (50%) + velocity (30%) + popularity (20%)
    return (
        totalEngagement * 0.5 +
        velocity * 10 * 0.3 +  // Scale velocity to similar range
        popularity * 100 * 0.2  // Scale percentile to similar range
    ) * recencyBoost;
}

/**
 * Get rising stars - fast-growing events not yet mainstream
 */
export async function getRisingStars(options: {
    limit?: number;
    category?: string;
} = {}): Promise<IEvent[]> {
    const { limit = 20, category } = options;

    const query: any = {
        startDate: { $gte: new Date() },
        'stats.categoryPopularityPercentile': { $lt: 0.7 },
        $or: [
            { 'stats.favouriteCount': { $gte: 2 } },
            { 'stats.clickthroughCount': { $gte: 3 } },
            { 'stats.viewCount': { $gte: 15 } }
        ]
    };
    if (category) query.category = category;

    const events = await Event.find(query).limit(100).lean();

    // Score by velocity
    const scored = events.map(event => {
        const { viewCount = 0, favouriteCount = 0, clickthroughCount = 0 } = event.stats || {};
        const totalEngagement = viewCount * 0.1 + favouriteCount * 5 + clickthroughCount * 3;
        const daysSinceListed = Math.max(1, (Date.now() - event.scrapedAt.getTime()) / (1000 * 60 * 60 * 24));
        const velocity = totalEngagement / daysSinceListed;

        return { event, velocity };
    });

    scored.sort((a, b) => b.velocity - a.velocity);
    return scored.slice(0, limit).map(item => item.event);
}

/**
 * Get undiscovered gems - quality venues with low engagement
 * These are events at good venues that users haven't found yet
 */
export async function getUndiscoveredGems(options: {
    limit?: number;
    category?: string;
} = {}): Promise<IEvent[]> {
    const { limit = 20, category } = options;

    const query: any = {
        startDate: { $gte: new Date() },
        // Low user engagement
        'stats.favouriteCount': { $lte: 2 },
        'stats.viewCount': { $lte: 20 },
        // But quality venue/price signals
        'stats.rawPopularityScore': { $gte: 6 }
    };
    if (category) query.category = category;

    const events = await Event.find(query).limit(100).lean();

    // Score by venue quality + recency
    const scored = events.map(event => {
        const venueScore = event.stats?.rawPopularityScore ?? 5;
        const daysUntilEvent = (event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - (daysUntilEvent / 90));

        return {
            event,
            score: venueScore * 0.7 + recencyScore * 10 * 0.3
        };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.event);
}

/**
 * Get similar events to a specific event
 */
export async function getSimilarEvents(
    eventId: mongoose.Types.ObjectId,
    options: { limit?: number } = {}
) {
    const { limit = 6 } = options;

    const targetEvent = await Event.findById(eventId).lean();
    if (!targetEvent) return [];

    const targetVector = extractEventFeatures(targetEvent);

    const candidates = await Event.find({
        category: targetEvent.category,
        startDate: { $gte: new Date() },
        _id: { $ne: eventId },
    }).limit(50).lean();

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

    const userPreferences = buildSimpleUserVector(user);

    const query: any = { startDate: { $gte: new Date() } };
    if (category) query.category = category;
    if (user.preferences?.locations?.length) {
        query['venue.suburb'] = { $in: user.preferences.locations };
    }

    let events = await Event.find(query).limit(200).lean();

    if (excludeFavorited) {
        const favorited = await UserInteraction.find({
            userId,
            interactionType: 'favourite',
        }).select('eventId');

        const favIds = new Set(favorited.map(f => f.eventId.toString()));
        events = events.filter(e => !favIds.has(e._id.toString()));
    }

    const scored = events.map(event => {
        const eventVector = extractEventFeatures(event);
        const contentMatch = cosineSimilarity(userPreferences, eventVector.fullVector);
        const popularity = (event.stats?.favouriteCount || 0) / 100;
        const score = contentMatch * 0.7 + popularity * 0.3;

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
// HELPERS
// ============================================

function buildSimpleUserVector(user: any): number[] {
    const vector: number[] = [];
    const categoryWeights = user.preferences?.categoryWeights || {};
    const categories = ['music', 'theatre', 'sports', 'arts', 'family', 'other'];

    for (const cat of categories) {
        vector.push((categoryWeights[cat] || 0.5) * 10.0);
    }

    const ALL_SUBCATEGORIES = CATEGORIES.flatMap(cat =>
        (cat.subcategories || []).map(sub => `${cat.value}:${sub}`)
    );

    for (const fullSubcat of ALL_SUBCATEGORIES) {
        const [category] = fullSubcat.split(':');
        const categoryWeight = categoryWeights[category] || 0.5;
        vector.push(categoryWeight * 2.0);
    }

    vector.push((user.preferences?.pricePreference || 0.5) * 1.0);
    vector.push((user.preferences?.venuePreference || 0.5) * 1.0);
    vector.push((user.preferences?.popularityPreference || 0.5) * 3.0);

    return vector;
}

function generateReason(event: IEvent, user: any, similarity: number): string {
    if (similarity > 0.8) return 'Strong match with your preferences';
    if (similarity > 0.6) return 'Matches your interests';
    if ((event.stats?.favouriteCount || 0) > 50) return `Popular in ${event.category}`;
    return 'Recommended for you';
}
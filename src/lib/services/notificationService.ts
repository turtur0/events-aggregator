// lib/services/notificationService.ts
import User from '@/lib/models/User';
import UserFavourite from '../models/UserFavourites';
import Notification from '../models/Notifications';
import { IEvent } from '@/lib/models/Event';
import { extractEventFeatures, cosineSimilarity } from '@/lib/ml/vectorService';
import { CATEGORIES } from '@/lib/categories';
import mongoose from 'mongoose';

/**
 * Process notifications for a new event
 * Triggers: keyword matches and personalized recommendations
 */
export async function processNewEventNotifications(event: IEvent): Promise<number> {
    try {
        const users = await User.find({
            'preferences.notifications.inApp': true,
        }).lean();

        if (users.length === 0) {
            console.log('  ℹ No users with notifications enabled');
            return 0;
        }

        console.log(`  → Checking ${users.length} users for notifications...`);
        let notificationCount = 0;

        for (const user of users) {
            try {
                const notification = await evaluateEventForUser(user, event);

                if (notification) {
                    await createNotification(notification);
                    notificationCount++;
                    console.log(`    ✓ Notified ${user.email}: ${notification.type} (score: ${notification.relevanceScore?.toFixed(2)})`);
                }
            } catch (userError) {
                console.error(`    ✗ Error evaluating user ${user.email}:`, userError);
            }
        }

        return notificationCount;
    } catch (error) {
        console.error('Error processing new event notifications:', error);
        return 0;
    }
}
/**
 * Process notifications for favorited event updates
 * Triggers: price drops and significant changes
 */
export async function processFavoritedEventUpdate(
    event: IEvent,
    changes: { priceDropped?: boolean; priceDrop?: number; significantUpdate?: string }
): Promise<number> {
    try {
        // Step 1: Find all users who favorited this event from UserFavourite collection
        const favorites = await UserFavourite.find({
            eventId: event._id,
        }).lean();

        if (favorites.length === 0) {
            console.log('  ℹ No users have favorited this event');
            return 0;
        }

        const userIds = favorites.map(f => f.userId);

        // Step 2: Get users with notifications enabled
        const users = await User.find({
            _id: { $in: userIds },
            'preferences.notifications.inApp': true,
        }).lean();

        if (users.length === 0) {
            console.log('  ℹ No favoriting users have notifications enabled');
            return 0;
        }

        console.log(`  → Notifying ${users.length} users about favorited event update...`);
        let notificationCount = 0;

        for (const user of users) {
            // Check if notification already exists for this update
            const existingNotification = await Notification.findOne({
                userId: user._id,
                eventId: event._id,
                type: 'favorite_update',
                // Only check for recent notifications (within last hour)
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            });

            if (existingNotification) {
                console.log(`    ⊘ Recent notification already exists for ${user.email}`);
                continue;
            }

            // Notify for price changes
            if (changes.priceDropped && changes.priceDrop) {
                await createNotification({
                    userId: user._id.toString(),
                    eventId: event._id.toString(),
                    type: 'favorite_update',
                    title: 'Price Drop on Favorited Event',
                    message: `${event.title} is now $${changes.priceDrop.toFixed(2)} cheaper!`,
                    relevanceScore: 1.0,
                });
                notificationCount++;
                console.log(`    ✓ Notified ${user.email}: Price drop $${changes.priceDrop.toFixed(2)}`);
            }
            // Notify for significant updates
            else if (changes.significantUpdate) {
                await createNotification({
                    userId: user._id.toString(),
                    eventId: event._id.toString(),
                    type: 'favorite_update',
                    title: 'Update on Favorited Event',
                    message: `${event.title}: ${changes.significantUpdate}`,
                    relevanceScore: 0.8,
                });
                notificationCount++;
                console.log(`    ✓ Notified ${user.email}: ${changes.significantUpdate}`);
            }
        }

        return notificationCount;
    } catch (error) {
        console.error('Error processing favorited event updates:', error);
        return 0;
    }
}

/**
 * Evaluate if user should be notified about this event
 * Returns notification data if user should be notified, null otherwise
 */
async function evaluateEventForUser(
    user: any,
    event: IEvent
): Promise<{
    userId: string;
    eventId: string;
    type: string;
    title: string;
    message: string;
    relevanceScore: number;
} | null> {
    const userId = user._id.toString();
    const eventId = event._id.toString();

    // Check if notification already exists
    const existingNotification = await Notification.findOne({ userId, eventId });
    if (existingNotification) {
        console.log(`    ⊘ Notification already exists for ${user.email}`);
        return null;
    }

    // 1. KEYWORD MATCH (highest priority)
    const keywords = user.preferences?.notifications?.keywords || [];
    if (keywords.length > 0) {
        const titleLower = event.title.toLowerCase();
        const descLower = event.description?.toLowerCase() || '';
        const matchedKeyword = keywords.find((keyword: string) =>
            titleLower.includes(keyword.toLowerCase()) ||
            descLower.includes(keyword.toLowerCase())
        );

        if (matchedKeyword) {
            console.log(`    🔑 Keyword match: "${matchedKeyword}"`);
            return {
                userId,
                eventId,
                type: 'keyword_match',
                title: `${matchedKeyword} Event Found`,
                message: `${event.title} at ${event.venue.name}`,
                relevanceScore: 1.0,
            };
        }
    }

    // 2. PERSONALIZED RECOMMENDATION
    const smartFiltering = user.preferences?.notifications?.smartFiltering;
    if (smartFiltering?.enabled !== false) { // Default to enabled
        try {
            const score = await getRecommendationScoreDirect(user, event);
            const threshold = smartFiltering?.minRecommendationScore || 0.6;

            if (score !== null && score >= threshold) {
                console.log(`    🎯 Recommendation match: ${score.toFixed(2)} >= ${threshold}`);
                return {
                    userId,
                    eventId,
                    type: 'recommendation',
                    title: `Recommended ${event.category} Event`,
                    message: `${event.title} at ${event.venue.name}`,
                    relevanceScore: score,
                };
            } else if (score !== null) {
                console.log(`    ⊘ Score too low: ${score.toFixed(2)} < ${threshold}`);
            }
        } catch (error) {
            console.error(`    ✗ Error calculating recommendation score:`, error);
        }
    } else {
        console.log(`    ⊘ Smart filtering disabled`);
    }

    return null;
}

/**
 * Get recommendation score for a specific event - DIRECT CALCULATION
 * Much more efficient than calling getPersonalizedRecommendations
 */
async function getRecommendationScoreDirect(user: any, event: IEvent): Promise<number | null> {
    try {
        // Build user preference vector
        const userPreferences = buildSimpleUserVector(user);

        // Extract event features
        const eventVector = extractEventFeatures(event);

        // DEBUG: Log vector lengths
        if (userPreferences.length !== eventVector.fullVector.length) {
            console.error(`    ✗ Vector length mismatch: user=${userPreferences.length}, event=${eventVector.fullVector.length}`);
            console.error(`    User categories:`, CATEGORIES.map(c => `${c.value}(${c.subcategories?.length || 0})`));
            return null;
        }

        // Calculate similarity
        const contentMatch = cosineSimilarity(userPreferences, eventVector.fullVector);

        // Add popularity component
        const popularity = (event.stats?.favouriteCount || 0) / 100;

        // Combined score (same formula as in recommendationService)
        const score = contentMatch * 0.7 + popularity * 0.3;

        // DEBUG: Log score components for first few events
        const debugCount = (global as any).__notificationDebugCount || 0;
        if (debugCount < 3) {
            console.log(`    🔍 Debug: contentMatch=${contentMatch.toFixed(3)}, popularity=${popularity.toFixed(3)}, finalScore=${score.toFixed(3)}`);
            (global as any).__notificationDebugCount = debugCount + 1;
        }

        return score;
    } catch (error) {
        console.error('Error calculating recommendation score:', error);
        return null;
    }
}

/**
 * Build simple user vector from preferences
 * MUST match the exact structure from recommendationService.ts
 * Uses CATEGORIES from categories.ts to ensure consistency
 */
function buildSimpleUserVector(user: any): number[] {
    const vector: number[] = [];
    const categoryWeights = user.preferences?.categoryWeights || {};

    // Convert Map to object if needed
    const weights = categoryWeights instanceof Map
        ? Object.fromEntries(categoryWeights)
        : categoryWeights;

    // DEBUG: Log user preferences (only once)
    const debugCount = (global as any).__userVectorDebugCount || 0;
    if (debugCount === 0) {
        console.log(`    🔍 User preferences:`, {
            categoryWeights: weights,
            pricePreference: user.preferences?.pricePreference,
            venuePreference: user.preferences?.venuePreference,
            popularityPreference: user.preferences?.popularityPreference,
        });
        (global as any).__userVectorDebugCount = 1;
    }

    // 1. Category weights (one per category)
    for (const cat of CATEGORIES) {
        vector.push((weights[cat.value] || 0.5) * 10.0);
    }

    // 2. Subcategory weights (all subcategories across all categories)
    for (const cat of CATEGORIES) {
        const categoryWeight = weights[cat.value] || 0.5;
        const subcategories = cat.subcategories || [];

        for (const sub of subcategories) {
            vector.push(categoryWeight * 2.0);
        }
    }

    // 3. User preferences
    vector.push((user.preferences?.pricePreference || 0.5) * 1.0);
    vector.push((user.preferences?.venuePreference || 0.5) * 1.0);
    vector.push((user.preferences?.popularityPreference || 0.5) * 3.0);

    // DEBUG: Log vector length (only once)
    if (debugCount === 0) {
        console.log(`    🔍 User vector length: ${vector.length}`);
        console.log(`    🔍 Category count: ${CATEGORIES.length}`);
        console.log(`    🔍 Total subcategories: ${CATEGORIES.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}`);
    }

    return vector;
}

/**
 * Create notification in database
 */
async function createNotification(data: {
    userId: string;
    eventId: string;
    type: string;
    title: string;
    message: string;
    relevanceScore: number;
}): Promise<void> {
    try {
        await Notification.create({
            userId: data.userId,
            eventId: data.eventId,
            type: data.type,
            title: data.title,
            message: data.message,
            relevanceScore: data.relevanceScore,
            read: false,
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}
/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(userId: string) {
    return Notification.find({ userId, read: false })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('eventId')
        .lean();
}

/**
 * Get all notifications for user (read and unread)
 */
export async function getAllNotifications(userId: string) {
    return Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('eventId')
        .lean();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false });
}

/**
 * Mark notifications as read
 */
export async function markAsRead(notificationIds: string[]): Promise<void> {
    await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { read: true } }
    );
}

/**
 * Mark all notifications as read for user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } }
    );
}
// lib/services/notificationService.ts
import User from '@/lib/models/User';
import Notification from '../models/Notifications';
import { IEvent } from '@/lib/models/Event';
import { getPersonalizedRecommendations } from '@/lib/ml/recommendationService';
import mongoose from 'mongoose';

interface NotificationCandidate {
    userId: string;
    score: number;
    reason: string;
}

/**
 * Main function: Check if new event should trigger notifications
 * Called when scraper adds new events
 */
export async function processNewEventNotifications(event: IEvent): Promise<number> {
    try {
        // Get users who have notifications enabled
        const users = await User.find({
            'preferences.notifications.inApp': true,
        }).lean();

        const notificationsCreated: number[] = [];

        for (const user of users) {
            const shouldNotify = await shouldNotifyUser(user, event);

            if (shouldNotify.notify) {
                await createNotification({
                    userId: user._id.toString(),
                    eventId: event._id.toString(),
                    event,
                    score: shouldNotify.score,
                    reason: shouldNotify.reason,
                });
                notificationsCreated.push(1);
            }
        }

        return notificationsCreated.length;
    } catch (error) {
        console.error('Error processing notifications:', error);
        return 0;
    }
}

/**
 * Determine if user should be notified about this event
 */
async function shouldNotifyUser(
    user: any,
    event: IEvent
): Promise<{ notify: boolean; score?: number; reason?: string }> {
    // 1. Check if user has selected this category
    const hasCategory = user.preferences.selectedCategories.includes(event.category) ||
        user.preferences.selectedSubcategories.some((sub: string) =>
            event.subcategories?.includes(sub)
        );

    if (!hasCategory) {
        return { notify: false };
    }

    // 2. Check keyword matches (if user has keywords set)
    if (user.preferences.notifications.keywords?.length > 0) {
        const titleLower = event.title.toLowerCase();
        const hasKeyword = user.preferences.notifications.keywords.some((keyword: string) =>
            titleLower.includes(keyword.toLowerCase())
        );

        if (hasKeyword) {
            return {
                notify: true,
                score: 1.0,
                reason: 'Keyword match'
            };
        }
    }

    // 3. Check price range
    const eventPrice = event.priceMin || 0;
    const inPriceRange = eventPrice >= user.preferences.priceRange.min &&
        eventPrice <= user.preferences.priceRange.max;

    if (!inPriceRange && !event.isFree) {
        return { notify: false };
    }

    // 4. Smart filtering using recommendation engine
    if (user.preferences.notifications.smartFiltering?.enabled) {
        try {
            // Use personalized recommendations to get a score for this specific event
            const recommendations = await getPersonalizedRecommendations(
                new mongoose.Types.ObjectId(user._id),
                user,
                {
                    limit: 100,
                    category: event.category,
                    excludeFavorited: false
                }
            );

            // Find this event in the recommendations
            const eventRecommendation = recommendations.find(
                rec => rec.event._id.toString() === event._id.toString()
            );

            if (eventRecommendation) {
                const score = eventRecommendation.score;
                const threshold = user.preferences.notifications.smartFiltering.minRecommendationScore || 0.6;

                if (score >= threshold) {
                    return {
                        notify: true,
                        score,
                        reason: eventRecommendation.explanation.reason || `Recommendation score: ${(score * 100).toFixed(0)}%`
                    };
                } else {
                    return { notify: false };
                }
            } else {
                // Event not in recommendations, but let's still notify if it passes basic criteria
                // This handles edge cases where the event might be filtered out by location, etc.
                return {
                    notify: true,
                    score: 0.5,
                    reason: 'Basic criteria match'
                };
            }
        } catch (error) {
            console.error('Error calculating recommendation score:', error);
            // Fallback: notify if basic criteria met
            return {
                notify: true,
                score: 0.5,
                reason: 'Basic criteria match'
            };
        }
    }

    // 5. Default: notify if basic criteria met
    return {
        notify: true,
        score: 0.5,
        reason: 'Category and price match'
    };
}

/**
 * Create a notification in the database
 */
async function createNotification({
    userId,
    eventId,
    event,
    score,
    reason,
}: {
    userId: string;
    eventId: string;
    event: IEvent;
    score?: number;
    reason?: string;
}): Promise<void> {
    try {
        // Check if notification already exists for this user/event
        const existing = await Notification.findOne({
            userId,
            eventId,
        });

        if (existing) {
            return; // Don't create duplicate
        }

        // Format title and message
        const title = `New ${event.category} Event`;
        const message = `${event.title} at ${event.venue.name}`;

        await Notification.create({
            userId,
            eventId,
            type: 'new_event',
            title,
            message,
            relevanceScore: score,
            read: false,
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
    return Notification.find({
        userId,
        read: false,
    })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('eventId')
        .lean();
}

/**
 * Get notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
        userId,
        read: false,
    });
}

/**
 * Mark notification(s) as read
 */
export async function markAsRead(notificationIds: string[]): Promise<void> {
    await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { read: true } }
    );
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } }
    );
}
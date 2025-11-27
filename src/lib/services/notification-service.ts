import { CATEGORIES } from '@/lib/constants/categories';
import { cosineSimilarity, extractEventFeatures } from '@/lib/ml';
import { Event, User, UserFavourite, Notification, type IEvent } from '@/lib/models';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Structured notification data for database creation
 */
interface NotificationData {
    userId: string;
    eventId: string;
    type: string;
    title: string;
    message: string;
    relevanceScore: number;
}

/**
 * Detected changes in a favourited event
 */
export interface EventChanges {
    priceDropped?: boolean;
    priceDrop?: number;
    significantUpdate?: string;
}

// ============================================
// PRIVATE HELPERS
// ============================================

/**
 * Finds if any user keywords match the event title or description
 */
function findMatchingKeyword(event: IEvent, keywords: string[]): string | null {
    const titleLower = event.title.toLowerCase();
    const descLower = event.description?.toLowerCase() || '';

    return keywords.find(keyword =>
        titleLower.includes(keyword.toLowerCase()) ||
        descLower.includes(keyword.toLowerCase())
    ) || null;
}

/**
 * Checks if event matches user's popularity preference
 * Uses tolerance bands to avoid over-filtering
 */
function matchesPopularityPreference(event: IEvent, user: any): boolean {
    const userPref = user.preferences?.popularityPreference ?? 0.5;
    const eventPopularity = event.stats?.categoryPopularityPercentile ?? 0.5;

    if (userPref <= 0.2) {
        // Hidden gems: notify for bottom 60%
        return eventPopularity <= 0.6;
    } else if (userPref >= 0.8) {
        // Mainstream: notify for top 60%
        return eventPopularity >= 0.4;
    } else {
        // Balanced: notify for all events
        return true;
    }
}

/**
 * Builds user preference vector for similarity scoring
 * Must stay in sync with emailDigestService and recommendationService
 */
function buildUserVector(user: any): number[] {
    const vector: number[] = [];
    const categoryWeights = user.preferences?.categoryWeights || {};

    // Convert Map to object if needed
    const weights = categoryWeights instanceof Map
        ? Object.fromEntries(categoryWeights)
        : categoryWeights;

    // Main category weights (6 categories × 10.0)
    CATEGORIES.forEach(cat => {
        vector.push((weights[cat.value] || 0.5) * 10.0);
    });

    // Subcategory weights (all subcategories × 2.0)
    CATEGORIES.forEach(cat => {
        const categoryWeight = weights[cat.value] || 0.5;
        const subcategories = cat.subcategories || [];
        subcategories.forEach(() => {
            vector.push(categoryWeight * 2.0);
        });
    });

    // User preference dimensions
    vector.push((user.preferences?.pricePreference || 0.5) * 1.0);
    vector.push((user.preferences?.venuePreference || 0.5) * 1.0);
    vector.push((user.preferences?.popularityPreference || 0.5) * 3.0);

    return vector;
}

/**
 * Calculates recommendation score using vector similarity
 * Combines content matching (70%) and popularity (30%)
 */
async function calculateRecommendationScore(
    user: any,
    event: IEvent
): Promise<number | null> {
    try {
        const userVector = buildUserVector(user);
        const eventVector = extractEventFeatures(event);

        // Validate dimensions match
        if (userVector.length !== eventVector.fullVector.length) {
            console.error(
                `[Notifications] Vector mismatch: user=${userVector.length}, event=${eventVector.fullVector.length}`
            );
            return null;
        }

        // Calculate similarity score
        const contentMatch = cosineSimilarity(userVector, eventVector.fullVector);
        const popularity = Math.min((event.stats?.favouriteCount || 0) / 100, 1);

        return contentMatch * 0.7 + popularity * 0.3;
    } catch (error) {
        console.error('[Notifications] Error calculating score:', error);
        return null;
    }
}

/**
 * Evaluates if an event should trigger a notification for a user
 * Checks keywords first, then applies smart filtering with popularity preference
 */
async function evaluateEventForUser(
    user: any,
    event: IEvent
): Promise<NotificationData | null> {
    const userId = user._id.toString();
    const eventId = event._id.toString();

    // Skip if notification already exists
    const existingNotification = await Notification.findOne({ userId, eventId });
    if (existingNotification) return null;

    // Priority 1: Keyword matches (always notify)
    const keywords = user.preferences?.notifications?.keywords || [];
    if (keywords.length > 0) {
        const matchedKeyword = findMatchingKeyword(event, keywords);
        if (matchedKeyword) {
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

    // Priority 2: Smart filtering with recommendations
    const smartFiltering = user.preferences?.notifications?.smartFiltering;
    if (smartFiltering?.enabled !== false) {
        // Apply popularity filter before scoring
        if (!matchesPopularityPreference(event, user)) {
            return null;
        }

        const score = await calculateRecommendationScore(user, event);
        const threshold = smartFiltering?.minRecommendationScore || 0.6;

        if (score !== null && score >= threshold) {
            return {
                userId,
                eventId,
                type: 'recommendation',
                title: `Recommended ${event.category} Event`,
                message: `${event.title} at ${event.venue.name}`,
                relevanceScore: score,
            };
        }
    }

    return null;
}

/**
 * Creates a notification record in the database
 */
async function createNotification(data: NotificationData): Promise<void> {
    await Notification.create({
        userId: data.userId,
        eventId: data.eventId,
        type: data.type,
        title: data.title,
        message: data.message,
        relevanceScore: data.relevanceScore,
        read: false,
    });
}

// ============================================
// PUBLIC API - EVENT PROCESSING
// ============================================

/**
 * Processes notifications for a new event
 * Evaluates all users with notifications enabled for matches
 * 
 * @param event - The newly scraped event
 * @returns Number of notifications created
 */
export async function processNewEventNotifications(event: IEvent): Promise<number> {
    try {
        const users = await User.find({
            'preferences.notifications.inApp': true,
        }).lean();

        if (!users.length) {
            console.log('[Notifications] No users with notifications enabled');
            return 0;
        }

        console.log(`[Notifications] Evaluating ${users.length} users for: ${event.title}`);
        let notificationCount = 0;

        for (const user of users) {
            try {
                const notification = await evaluateEventForUser(user, event);
                if (notification) {
                    await createNotification(notification);
                    notificationCount++;
                }
            } catch (userError) {
                console.error(`[Notifications] Error for user ${user.email}:`, userError);
            }
        }

        if (notificationCount > 0) {
            console.log(`[Notifications] Created ${notificationCount} notifications`);
        }

        return notificationCount;
    } catch (error) {
        console.error('[Notifications] Error processing new event:', error);
        return 0;
    }
}

/**
 * Processes notifications for favourited event updates
 * Notifies users who favourited an event when prices drop or significant changes occur
 * 
 * @param event - The updated event
 * @param changes - Detected changes (price drops, significant updates)
 * @returns Number of notifications created
 */
export async function processFavouritedEventUpdate(
    event: IEvent,
    changes: EventChanges
): Promise<number> {
    try {
        // Find users who favourited this event
        const favourites = await UserFavourite.find({ eventId: event._id }).lean();
        if (!favourites.length) return 0;

        const userIds = favourites.map(f => f.userId);
        const users = await User.find({
            _id: { $in: userIds },
            'preferences.notifications.inApp': true,
        }).lean();

        if (!users.length) return 0;

        console.log(
            `[Notifications] Processing favourite update for ${users.length} users: ${event.title}`
        );
        let notificationCount = 0;

        for (const user of users) {
            // Prevent duplicate notifications within the last hour
            const recentNotification = await Notification.findOne({
                userId: user._id,
                eventId: event._id,
                type: 'favourite_update',
                createdAt: { $gte: new Date(Date.now() - 3600000) },
            });

            if (recentNotification) continue;

            // Create notification based on change type
            if (changes.priceDropped && changes.priceDrop) {
                await createNotification({
                    userId: user._id.toString(),
                    eventId: event._id.toString(),
                    type: 'favourite_update',
                    title: 'Price Drop on Favourited Event',
                    message: `${event.title} is now $${changes.priceDrop.toFixed(2)} cheaper!`,
                    relevanceScore: 1.0,
                });
                notificationCount++;
            } else if (changes.significantUpdate) {
                await createNotification({
                    userId: user._id.toString(),
                    eventId: event._id.toString(),
                    type: 'favourite_update',
                    title: 'Update on Favourited Event',
                    message: `${event.title}: ${changes.significantUpdate}`,
                    relevanceScore: 0.8,
                });
                notificationCount++;
            }
        }

        if (notificationCount > 0) {
            console.log(`[Notifications] Created ${notificationCount} favourite update notifications`);
        }

        return notificationCount;
    } catch (error) {
        console.error('[Notifications] Error processing favourite updates:', error);
        return 0;
    }
}

// ============================================
// PUBLIC API - QUERIES
// ============================================

/**
 * Retrieves unread notifications for a user
 * 
 * @param userId - User's database ID
 * @returns Array of unread notifications with populated event data
 */
export async function getUnreadNotifications(userId: string) {
    return Notification.find({ userId, read: false })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('eventId')
        .lean();
}

/**
 * Retrieves all notifications for a user
 * 
 * @param userId - User's database ID
 * @returns Array of all notifications with populated event data
 */
export async function getAllNotifications(userId: string) {
    return Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('eventId')
        .lean();
}

/**
 * Gets count of unread notifications for a user
 * 
 * @param userId - User's database ID
 * @returns Number of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false });
}

/**
 * Marks specific notifications as read
 * 
 * @param notificationIds - Array of notification IDs to mark as read
 */
export async function markAsRead(notificationIds: string[]): Promise<void> {
    await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { read: true } }
    );
}

/**
 * Marks all notifications as read for a user
 * 
 * @param userId - User's database ID
 */
export async function markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } }
    );
}
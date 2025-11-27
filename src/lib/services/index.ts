// lib/services/index.ts

// ============================================
// ANALYTICS SERVICE
// ============================================
export {
    computePriceDistribution,
    computeTimeline,
    computePopularityData,
} from './analytics-service';

export type {
    PriceDistribution,
    TimelineData,
    PopularityData,
} from './analytics-service';

// ============================================
// EMAIL DIGEST SERVICE
// ============================================
export {
    sendScheduledDigests,
} from './email-digest-service';

// ============================================
// NOTIFICATION SERVICE
// ============================================
export {
    processNewEventNotifications,
    processFavoritedEventUpdate,
    getUnreadNotifications,
    getAllNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from './notification-service';

// ============================================
// DEFAULT EXPORT (All Services)
// ============================================
import * as analyticsService from './analytics-service';
import * as emailDigestService from './email-digest-service';
import * as notificationService from './notification-service';

export default {
    // Analytics
    computePriceDistribution: analyticsService.computePriceDistribution,
    computeTimeline: analyticsService.computeTimeline,
    computePopularityData: analyticsService.computePopularityData,

    // Email Digest
    sendScheduledDigests: emailDigestService.sendScheduledDigests,

    // Notifications
    processNewEventNotifications: notificationService.processNewEventNotifications,
    processFavoritedEventUpdate: notificationService.processFavoritedEventUpdate,
    getUnreadNotifications: notificationService.getUnreadNotifications,
    getAllNotifications: notificationService.getAllNotifications,
    getUnreadCount: notificationService.getUnreadCount,
    markAsRead: notificationService.markAsRead,
    markAllAsRead: notificationService.markAllAsRead,
} as const;
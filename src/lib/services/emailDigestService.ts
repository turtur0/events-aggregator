// lib/services/emailDigestService.ts
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import { Resend } from 'resend';
import MonthlyDigestEmail from '@/emails/MonthlyDigestEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DigestContent {
    keywordMatches: any[];
    updatedFavorites: any[];
    recommendations: { category: string; events: any[] }[];
}

/**
 * Main function to send digest emails
 * Run this via cron job (weekly on Sunday evening, monthly on 1st)
 */
export async function sendScheduledDigests(frequency: 'weekly' | 'monthly') {
    console.log(`[Email Digest] Starting ${frequency} digest send...`);

    // For monthly, only send on the first Sunday of the month
    if (frequency === 'monthly') {
        const today = new Date();
        const dayOfMonth = today.getDate();
        // If today is not between 1-7 (first week), skip
        if (dayOfMonth > 7) {
            console.log(`[Email Digest] Skipping monthly digest - not first Sunday (day ${dayOfMonth})`);
            return { sent: 0, skipped: 0, errors: 0 };
        }
    }

    const users = await User.find({
        'preferences.notifications.email': true,
        'preferences.notifications.emailFrequency': frequency,
    }).lean();

    console.log(`[Email Digest] Found ${users.length} users for ${frequency} digest`);

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
        try {
            const content = await buildDigestContent(user, frequency);

            // Skip if no content
            if (!hasContent(content)) {
                skipped++;
                continue;
            }

            await sendDigestEmail(user, content);

            // Update last sent timestamp
            await User.updateOne(
                { _id: user._id },
                { $set: { 'preferences.notifications.lastEmailSent': new Date() } }
            );

            sent++;
        } catch (error) {
            console.error(`[Email Digest] Error for user ${user.email}:`, error);
            errors++;
        }
    }

    console.log(`[Email Digest] Complete: ${sent} sent, ${skipped} skipped, ${errors} errors`);
    return { sent, skipped, errors };
}

/**
 * Build personalized digest content for a user
 * EXPORTED for testing
 */
export async function buildDigestContent(
    user: any,
    frequency: 'weekly' | 'monthly'
): Promise<DigestContent> {
    const now = new Date();
    const lookbackDays = frequency === 'weekly' ? 7 : 30;
    const lookbackDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    // Get upcoming events (next 30 days for weekly, next 60 for monthly)
    const lookaheadDays = frequency === 'weekly' ? 30 : 60;
    const maxDate = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

    // 1. Events matching user's keywords (NEW events only)
    const keywordMatches = await findKeywordMatches(
        user,
        lookbackDate,
        maxDate
    );

    // 2. Updates to favorited events
    const updatedFavorites = await findUpdatedFavorites(
        user,
        lookbackDate
    );

    // 3. Personalized recommendations by category
    const recommendations = await buildRecommendations(
        user,
        maxDate,
        frequency
    );

    return {
        keywordMatches,
        updatedFavorites,
        recommendations,
    };
}

/**
 * Find events matching user's notification keywords
 */
async function findKeywordMatches(
    user: any,
    sinceDate: Date,
    maxDate: Date
): Promise<any[]> {
    const keywords = user.preferences.notifications.keywords || [];
    if (keywords.length === 0) return [];

    // Build regex patterns for each keyword (case-insensitive)
    const regexPatterns = keywords.map((kw: string) => new RegExp(kw, 'i'));

    const events = await Event.find({
        startDate: { $gte: new Date(), $lte: maxDate },
        scrapedAt: { $gte: sinceDate },
        $or: [
            { title: { $in: regexPatterns } },
            { description: { $in: regexPatterns } },
            { subcategories: { $in: keywords } },
        ],
    })
        .sort({ 'stats.categoryPopularityPercentile': -1 })
        .limit(10)
        .lean();

    return events;
}

/**
 * Find favorited events that have been updated
 */
async function findUpdatedFavorites(
    user: any,
    sinceDate: Date
): Promise<any[]> {
    if (!user.favorites || user.favorites.length === 0) return [];

    const events = await Event.find({
        _id: { $in: user.favorites },
        lastUpdated: { $gte: sinceDate },
        startDate: { $gte: new Date() }, // Only upcoming events
    })
        .sort({ lastUpdated: -1 })
        .limit(10)
        .lean();

    return events;
}

/**
 * Build category-based recommendations
 */
async function buildRecommendations(
    user: any,
    maxDate: Date,
    frequency: 'weekly' | 'monthly'
): Promise<{ category: string; events: any[] }[]> {
    const categories = user.preferences.selectedCategories || [];
    if (categories.length === 0) return [];

    const eventsPerCategory = frequency === 'weekly' ? 5 : 8;
    const minScore = user.preferences.notifications.smartFiltering?.minRecommendationScore || 0.6;

    const recommendations: { category: string; events: any[] }[] = [];

    for (const category of categories) {
        const events = await Event.find({
            category: category,
            startDate: { $gte: new Date(), $lte: maxDate },
            'stats.categoryPopularityPercentile': { $gte: minScore },
        })
            .sort({
                'stats.categoryPopularityPercentile': -1,
                startDate: 1,
            })
            .limit(eventsPerCategory)
            .lean();

        if (events.length > 0) {
            recommendations.push({ category, events });
        }
    }

    return recommendations;
}

/**
 * Send the actual email
 */
async function sendDigestEmail(user: any, content: DigestContent) {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications?unsubscribe=email`;
    const preferencesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`;

    const { data, error } = await resend.emails.send({
        from: 'Melbourne Events <events@yourdomain.com>',
        to: user.email,
        subject: `Your ${getDigestTitle(content)} - Melbourne Events`,
        react: MonthlyDigestEmail({
            userName: user.name,
            keywordMatches: content.keywordMatches,
            updatedFavorites: content.updatedFavorites,
            recommendations: content.recommendations,
            unsubscribeUrl,
            preferencesUrl,
        }),
    });

    if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
}

/**
 * Check if digest has any content worth sending
 */
function hasContent(content: DigestContent): boolean {
    return (
        content.keywordMatches.length > 0 ||
        content.updatedFavorites.length > 0 ||
        content.recommendations.length > 0
    );
}

/**
 * Generate email subject based on content
 */
function getDigestTitle(content: DigestContent): string {
    const total =
        content.keywordMatches.length +
        content.updatedFavorites.length +
        content.recommendations.reduce((sum, cat) => sum + cat.events.length, 0);

    if (content.keywordMatches.length > 0) {
        return `${total} events including "${content.keywordMatches[0].title}"`;
    }

    return `${total} curated events for you`;
}

// Also export as default for backward compatibility
export default buildDigestContent;
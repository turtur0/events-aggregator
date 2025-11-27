import { Resend } from 'resend';
import { render } from '@react-email/render';
import DigestEmail from '../email/templates/digest-email';

import { Event, User, UserFavourite, type IEvent } from '@/lib/models';
import { extractEventFeatures } from '@/lib/ml';
import { CATEGORIES } from '@/lib/constants/categories';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Serialised event for email template rendering
 */
interface SerializedEvent {
    _id: string;
    title: string;
    startDate: string;
    venue: { name: string };
    priceMin?: number;
    priceMax?: number;
    isFree: boolean;
    imageUrl?: string;
    category: string;
}

/**
 * Aggregated digest content for a single user
 */
interface DigestContent {
    keywordMatches: IEvent[];
    updatedFavourites: IEvent[];
    recommendations: { category: string; events: IEvent[] }[];
}

/**
 * Result summary from digest send operation
 */
interface DigestResult {
    sent: number;
    skipped: number;
    errors: number;
}

// ============================================
// RESEND CLIENT (Lazy Initialisation)
// ============================================

let resendClient: Resend | null = null;

function getResendClient(): Resend {
    if (!resendClient) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is not set');
        }
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// ============================================
// PRIVATE HELPERS
// ============================================

/**
 * Checks if digest content has any items to send
 */
function hasContent(content: DigestContent): boolean {
    return (
        content.keywordMatches.length > 0 ||
        content.updatedFavourites.length > 0 ||
        content.recommendations.length > 0
    );
}

/**
 * Generates contextual email subject line based on content
 */
function getDigestSubject(content: DigestContent, frequency: 'weekly' | 'monthly'): string {
    const total =
        content.keywordMatches.length +
        content.updatedFavourites.length +
        content.recommendations.reduce((sum, cat) => sum + cat.events.length, 0);

    const periodText = frequency === 'weekly' ? 'This Week' : 'This Month';

    if (content.keywordMatches.length > 0) {
        return `${total} events including "${content.keywordMatches[0].title}" - Melbourne Events`;
    }

    return `${total} curated events for you ${periodText} - Melbourne Events`;
}

/**
 * Converts Mongoose event document to plain object for email template
 */
function serialiseEvent(event: IEvent): SerializedEvent {
    return {
        _id: event._id.toString(),
        title: event.title,
        startDate: event.startDate.toISOString(),
        venue: { name: event.venue.name },
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        isFree: event.isFree,
        imageUrl: event.imageUrl,
        category: event.category,
    };
}

/**
 * Builds user preference vector for similarity scoring
 * Must stay in sync with notificationService and recommendationService
 */
function buildUserVector(user: any): number[] {
    const vector: number[] = [];
    const categoryWeights = user.preferences?.categoryWeights || {};

    // Main category weights (6 categories × 10.0)
    const mainCategories = ['music', 'theatre', 'sports', 'arts', 'family', 'other'];
    mainCategories.forEach(cat => {
        vector.push((categoryWeights[cat] || 0.5) * 10.0);
    });

    // Subcategory weights (all subcategories × 2.0)
    CATEGORIES.forEach(cat => {
        const categoryWeight = categoryWeights[cat.value] || 0.5;
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
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error(`Vector length mismatch: ${vectorA.length} vs ${vectorB.length}`);
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================
// CONTENT GATHERING
// ============================================

/**
 * Finds events matching user's notification keywords
 * Only returns events scraped since last digest
 */
async function findKeywordMatches(
    user: any,
    sinceDate: Date,
    maxDate: Date
): Promise<IEvent[]> {
    const keywords = user.preferences?.notifications?.keywords || [];
    if (!keywords.length) return [];

    const keywordRegex = keywords.join('|');

    const events = await Event.find({
        $or: [
            { title: { $regex: keywordRegex, $options: 'i' } },
            { description: { $regex: keywordRegex, $options: 'i' } },
        ],
        startDate: { $gte: new Date(), $lte: maxDate },
        scrapedAt: { $gte: sinceDate },
    })
        .sort({ startDate: 1 })
        .limit(5)
        .lean();

    return events;
}

/**
 * Finds favourited events that have been updated since last digest
 */
async function findUpdatedFavourites(
    user: any,
    sinceDate: Date
): Promise<IEvent[]> {
    const favourites = await UserFavourite.find({ userId: user._id }).lean();
    if (!favourites.length) return [];

    const favouriteEventIds = favourites.map(f => f.eventId);

    const events = await Event.find({
        _id: { $in: favouriteEventIds },
        startDate: { $gte: new Date() },
        lastUpdated: { $gt: sinceDate },
    })
        .sort({ startDate: 1 })
        .limit(5)
        .lean();

    return events;
}

/**
 * Builds personalised recommendations per category
 * Scores events using cosine similarity and popularity
 */
async function buildRecommendations(
    user: any,
    sinceDate: Date,
    maxDate: Date,
    frequency: 'weekly' | 'monthly'
): Promise<{ category: string; events: IEvent[] }[]> {
    const selectedCategories = user.preferences?.selectedCategories || [];
    if (!selectedCategories.length) return [];

    // Get favourited event IDs to exclude
    const favourites = await UserFavourite.find({ userId: user._id }).lean();
    const favouriteEventIds = favourites.map(f => f.eventId);

    const eventsPerCategory = frequency === 'weekly' ? 3 : 5;
    const recommendations: { category: string; events: IEvent[] }[] = [];

    for (const category of selectedCategories) {
        // Query new events in category
        const candidateEvents = await Event.find({
            category,
            startDate: { $gte: new Date(), $lte: maxDate },
            scrapedAt: { $gte: sinceDate },
            _id: { $nin: favouriteEventIds },
        })
            .sort({ startDate: 1 })
            .limit(100)
            .lean();

        if (!candidateEvents.length) continue;

        // Score and rank events
        const userVector = buildUserVector(user);

        const scored = candidateEvents.map(event => {
            const eventVector = extractEventFeatures(event);
            const contentMatch = cosineSimilarity(userVector, eventVector.fullVector);
            const popularity = Math.min((event.stats?.favouriteCount || 0) / 100, 1);
            const score = contentMatch * 0.7 + popularity * 0.3;

            return { event, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const topEvents = scored.slice(0, eventsPerCategory).map(s => s.event);

        if (topEvents.length > 0) {
            recommendations.push({ category, events: topEvents });
        }
    }

    return recommendations;
}

/**
 * Gathers all content sections for a single user's digest
 */
async function gatherDigestContent(
    user: any,
    frequency: 'weekly' | 'monthly'
): Promise<DigestContent> {
    const now = new Date();

    // Calculate time windows
    const lookbackDays = frequency === 'weekly' ? 7 : 30;
    const lookbackDate = user.preferences?.notifications?.lastEmailSent ||
        new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const lookaheadDays = frequency === 'weekly' ? 30 : 60;
    const maxDate = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

    // Gather all content sections
    const [keywordMatches, updatedFavourites, recommendations] = await Promise.all([
        findKeywordMatches(user, lookbackDate, maxDate),
        findUpdatedFavourites(user, lookbackDate),
        buildRecommendations(user, lookbackDate, maxDate, frequency),
    ]);

    return { keywordMatches, updatedFavourites, recommendations };
}

// ============================================
// EMAIL SENDING
// ============================================

/**
 * Sends digest email to a single user via Resend
 */
async function sendDigestEmail(
    user: any,
    content: DigestContent,
    frequency: 'weekly' | 'monthly'
): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Serialise all events for email template
    const serialisedContent = {
        keywordMatches: content.keywordMatches.map(serialiseEvent),
        updatedFavourites: content.updatedFavourites.map(serialiseEvent),
        recommendations: content.recommendations.map(cat => ({
            category: cat.category,
            events: cat.events.map(serialiseEvent),
        })),
    };

    // Render email HTML
    const emailHtml = await render(
        DigestEmail({
            userName: user.name.split(' ')[0] || 'there',
            keywordMatches: serialisedContent.keywordMatches,
            updatedFavourites: serialisedContent.updatedFavourites,
            recommendations: serialisedContent.recommendations,
            unsubscribeUrl: `${baseUrl}/settings`,
            preferencesUrl: `${baseUrl}/settings`,
        })
    );

    // Send via Resend
    const resend = getResendClient();
    const { error } = await resend.emails.send({
        from: 'Melbourne Events <onboarding@resend.dev>',
        to: user.email,
        subject: getDigestSubject(content, frequency),
        html: emailHtml,
    });

    if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[Digest] Sent ${frequency} digest to ${user.email}`);
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Sends scheduled digest emails to all eligible users
 * Called by cron job for weekly/monthly digests
 * 
 * @param frequency - 'weekly' or 'monthly' digest cadence
 * @returns Summary of send operation (sent, skipped, errors)
 */
export async function sendScheduledDigests(
    frequency: 'weekly' | 'monthly'
): Promise<DigestResult> {
    console.log(`[Digest] Starting ${frequency} digest send`);

    // Find users who want this frequency
    const users = await User.find({
        'preferences.notifications.email': true,
        'preferences.notifications.emailFrequency': frequency,
    }).lean();

    console.log(`[Digest] Found ${users.length} eligible users`);

    const result: DigestResult = { sent: 0, skipped: 0, errors: 0 };

    for (const user of users) {
        try {
            const content = await gatherDigestContent(user, frequency);

            if (!hasContent(content)) {
                console.log(`[Digest] Skipping ${user.email} - no content`);
                result.skipped++;
                continue;
            }

            await sendDigestEmail(user, content, frequency);

            // Update last sent timestamp
            await User.updateOne(
                { _id: user._id },
                { $set: { 'preferences.notifications.lastEmailSent': new Date() } }
            );

            result.sent++;

            // Rate limiting: 100ms between emails
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`[Digest] Error for ${user.email}:`, error);
            result.errors++;
        }
    }

    console.log(`[Digest] Complete:`, result);
    return result;
}
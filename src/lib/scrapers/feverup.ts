import { load } from 'cheerio';
import type { NormalisedEvent } from './types';
import { canScrape } from '../utils/robots-checker';

const BASE_URL = 'https://feverup.com';
const MELBOURNE_URL = `${BASE_URL}/en/melbourne/things-to-do`;

/** Polite headers to avoid detection */
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://feverup.com/en/melbourne',
};

interface FeverUpEvent {
    url: string;
    title: string;
    description: string;
    startDate?: Date;
    endDate?: Date;
    venue?: string;
    address?: string;
    suburb?: string;
    latitude?: number;
    longitude?: number;
    priceMin?: number;
    priceMax?: number;
    imageUrl?: string;
    category?: string;
    rating?: number;
    ratingCount?: number;
}

export interface FeverUpScrapeOptions {
    /** Maximum events to collect */
    maxEvents?: number;
    /** Whether to fetch individual event details */
    fetchDetails?: boolean;
    /** Delay between detail page fetches in milliseconds */
    detailFetchDelay?: number;
}

/**
 * Scrapes events from FeverUp Melbourne.
 * Uses structured data (JSON-LD) for reliable extraction.
 * 
 * @param opts - Scraping options
 * @returns Array of normalised events
 */
export async function scrapeFeverUpMelbourne(opts: FeverUpScrapeOptions = {}): Promise<NormalisedEvent[]> {
    const maxEvents = opts.maxEvents || 50;
    const fetchDetails = opts.fetchDetails ?? true;
    const allEvents: NormalisedEvent[] = [];
    const seenUrls = new Set<string>();

    console.log('[FeverUp] Checking robots.txt compliance');
    const allowed = await canScrape(MELBOURNE_URL);
    if (!allowed) {
        console.log('[FeverUp] Scraping disallowed by robots.txt');
        return [];
    }

    console.log('[FeverUp] Starting scrape of Melbourne events');
    console.log(`[FeverUp] Detail fetching: ${fetchDetails ? 'enabled' : 'disabled'}`);

    try {
        // Fetch listing page
        const eventUrls = await fetchEventListingUrls();
        console.log(`[FeverUp] Found ${eventUrls.length} event URLs`);

        const limit = Math.min(maxEvents, eventUrls.length);
        let processedCount = 0;

        for (let i = 0; i < eventUrls.length && processedCount < limit; i++) {
            const url = eventUrls[i];

            if (seenUrls.has(url)) {
                continue;
            }

            // Check robots.txt for individual event page
            const detailAllowed = await canScrape(url);
            if (!detailAllowed) {
                console.log(`[FeverUp] Skipping ${url} - disallowed by robots.txt`);
                continue;
            }

            const eventData = await fetchEventDetails(url);

            if (eventData && !isGiftCard(eventData)) {
                const normalisedEvent = toNormalisedEvent(eventData);

                if (normalisedEvent) {
                    allEvents.push(normalisedEvent);
                    seenUrls.add(url);
                    processedCount++;
                    console.log(`[FeverUp] Processed ${processedCount}/${limit}: ${normalisedEvent.title}`);
                }
            } else if (eventData && isGiftCard(eventData)) {
                console.log(`[FeverUp] Skipping gift card: ${eventData.title}`);
            }

            // Polite delay between requests
            await delay(opts.detailFetchDelay || 1500);
        }

        console.log(`[FeverUp] Total: ${allEvents.length} events scraped`);
        return allEvents;

    } catch (error: any) {
        console.error('[FeverUp] Scraping failed:', error.message);
        return allEvents; // Return what we've collected so far
    }
}

/**
 * Fetches event URLs from the listing page using structured data.
 */
async function fetchEventListingUrls(): Promise<string[]> {
    try {
        await delay(1000); // Initial polite delay

        const response = await fetch(MELBOURNE_URL, {
            headers: HEADERS,
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            console.error(`[FeverUp] Listing fetch failed: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const $ = load(html);

        // Extract event URLs from structured data (JSON-LD)
        const eventUrls: string[] = [];

        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');

                // Look for ItemList with event URLs
                if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
                    data.itemListElement.forEach((item: any) => {
                        if (item.url && item.url.includes('/m/')) {
                            const fullUrl = item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`;
                            eventUrls.push(fullUrl);
                        }
                    });
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        });

        // Fallback: scrape from HTML if structured data doesn't work
        if (eventUrls.length === 0) {
            $('a[href*="/m/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/m/')) {
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    if (!eventUrls.includes(fullUrl)) {
                        eventUrls.push(fullUrl);
                    }
                }
            });
        }

        return [...new Set(eventUrls)]; // Remove duplicates

    } catch (error: any) {
        console.error('[FeverUp] Listing fetch error:', error.message);
        return [];
    }
}

/**
 * Fetches and parses individual event page using structured data.
 */
async function fetchEventDetails(url: string): Promise<FeverUpEvent | null> {
    try {
        const response = await fetch(url, {
            headers: HEADERS,
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            console.log(`[FeverUp] Event fetch failed for ${url}: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const $ = load(html);

        // Extract structured data (JSON-LD) - this is the most reliable method
        let structuredData: any = null;

        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                if (data['@type'] === 'Product' || data['@type'] === 'Event') {
                    structuredData = data;
                }
            } catch (e) {
                // Ignore parse errors
            }
        });

        if (!structuredData) {
            console.log(`[FeverUp] No structured data found for ${url}`);
            return null;
        }

        // Extract event details from structured data
        const event: FeverUpEvent = {
            url,
            title: structuredData.name || '',
            description: cleanDescription(structuredData.description || ''),
            imageUrl: extractImageUrl(structuredData),
        };

        // Extract pricing from offers
        if (Array.isArray(structuredData.offers) && structuredData.offers.length > 0) {
            const prices = structuredData.offers
                .map((offer: any) => offer.price)
                .filter((price: any) => typeof price === 'number' && price > 0);

            if (prices.length > 0) {
                event.priceMin = Math.min(...prices);
                event.priceMax = prices.length > 1 ? Math.max(...prices) : undefined;
            }
        }

        // Extract venue and location
        const firstOffer = structuredData.offers?.[0];
        if (firstOffer?.areaServed) {
            event.venue = firstOffer.areaServed.name || 'Venue TBA';
            const addressLocality = firstOffer.areaServed.address?.addressLocality || 'Melbourne';
            event.address = addressLocality;
            event.suburb = extractSuburb(addressLocality);

            if (firstOffer.areaServed.geo) {
                event.latitude = firstOffer.areaServed.geo.latitude;
                event.longitude = firstOffer.areaServed.geo.longitude;
            }
        }

        // Extract rating
        if (structuredData.aggregateRating) {
            event.rating = structuredData.aggregateRating.ratingValue;
            event.ratingCount = structuredData.aggregateRating.ratingCount;
        }

        // Parse dates from HTML since structured data doesn't always have them
        const dateText = $('[class*="date"]').first().text().trim();
        const dates = parseDateRange(dateText);
        event.startDate = dates.startDate;
        event.endDate = dates.endDate;

        // Categorise event
        event.category = categoriseFeverUpEvent(event.title, event.description);

        return event;

    } catch (error: any) {
        console.log(`[FeverUp] Detail error for ${url}:`, error.message);
        return null;
    }
}

/**
 * Checks if an event is a gift card (not an actual event).
 */
function isGiftCard(event: FeverUpEvent): boolean {
    const titleLower = event.title.toLowerCase();
    return titleLower.includes('gift card') || titleLower.includes('giftcard');
}

/**
 * Extracts image URL from structured data.
 */
function extractImageUrl(structuredData: any): string | undefined {
    if (structuredData.image?.contentUrl) {
        return structuredData.image.contentUrl;
    }

    if (Array.isArray(structuredData.images) && structuredData.images.length > 0) {
        return structuredData.images[0].url || structuredData.images[0];
    }

    if (typeof structuredData.image === 'string') {
        return structuredData.image;
    }

    return undefined;
}

/**
 * Cleans description text by removing HTML and limiting length.
 */
function cleanDescription(desc: string): string {
    return desc
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalise whitespace
        .replace(/\n+/g, ' ') // Remove newlines
        .trim()
        .substring(0, 500); // Limit length
}

/**
 * Parses date range from text like "09 Dec - 01 Feb" or "Oct 2025".
 */
function parseDateRange(dateText: string): { startDate?: Date; endDate?: Date } {
    if (!dateText || dateText === 'Not found') {
        return {};
    }

    const currentYear = new Date().getFullYear();

    // Match "DD MMM - DD MMM" format
    const rangeMatch = dateText.match(/(\d{1,2})\s+(\w{3})\s*-\s*(\d{1,2})\s+(\w{3})/);
    if (rangeMatch) {
        const [, startDay, startMonth, endDay, endMonth] = rangeMatch;
        return {
            startDate: parseDate(startDay, startMonth, currentYear),
            endDate: parseDate(endDay, endMonth, currentYear),
        };
    }

    // Match "MMM YYYY" format
    const monthYearMatch = dateText.match(/(\w{3,})\s+(\d{4})/);
    if (monthYearMatch) {
        const [, month, year] = monthYearMatch;
        const date = new Date(`${month} 1, ${year}`);
        if (!isNaN(date.getTime())) {
            return { startDate: date };
        }
    }

    return {};
}

/**
 * Parses a date from day, month name, and year.
 */
function parseDate(day: string, month: string, year: number): Date | undefined {
    const date = new Date(`${month} ${day}, ${year}`);
    return !isNaN(date.getTime()) ? date : undefined;
}

/**
 * Extracts suburb from venue name or address.
 */
function extractSuburb(text: string): string {
    const melbourneSuburbs = [
        'Melbourne', 'Carlton', 'Fitzroy', 'Collingwood', 'Richmond',
        'Southbank', 'St Kilda', 'South Yarra', 'Docklands', 'CBD',
    ];

    for (const suburb of melbourneSuburbs) {
        if (text.includes(suburb)) {
            return suburb;
        }
    }

    return 'Melbourne';
}

/**
 * Categorises FeverUp event based on title and description.
 */
function categoriseFeverUpEvent(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    // Music indicators
    if (text.match(/\b(concert|music|symphony|orchestra|jazz|rock|pop|band)\b/)) {
        return 'music';
    }

    // Theatre indicators
    if (text.match(/\b(theatre|musical|play|opera|ballet|performance|show)\b/)) {
        return 'theatre';
    }

    // Arts & Culture indicators
    if (text.match(/\b(exhibition|gallery|art|museum|immersive|experience)\b/)) {
        return 'arts';
    }

    // Family indicators
    if (text.match(/\b(family|kids|children|interactive|workshop)\b/)) {
        return 'family';
    }

    // Sports indicators
    if (text.match(/\b(sport|game|match|race|tournament)\b/)) {
        return 'sports';
    }

    return 'other';
}

/**
 * Converts FeverUp event to normalised format.
 */
function toNormalisedEvent(event: FeverUpEvent): NormalisedEvent | null {
    if (!event.title || !event.startDate) {
        console.log('[FeverUp] Skipping event - missing required fields');
        return null;
    }

    return {
        title: event.title,
        description: event.description || 'No description available',
        category: event.category || 'other',
        subcategory: undefined, // FeverUp doesn't provide subcategories
        subcategories: [],

        startDate: event.startDate,
        endDate: event.endDate,

        venue: {
            name: event.venue || 'Venue TBA',
            address: event.address || 'Melbourne VIC',
            suburb: event.suburb || 'Melbourne',
        },

        priceMin: event.priceMin,
        priceMax: event.priceMax,
        priceDetails: event.rating
            ? `Rating: ${event.rating}/5 (${event.ratingCount} reviews)`
            : undefined,
        isFree: event.priceMin === 0,

        bookingUrl: event.url,
        imageUrl: event.imageUrl,

        source: 'feverup' as any, // Note: needs to be added to the source type
        sourceId: extractSourceId(event.url),
        scrapedAt: new Date(),
        lastUpdated: new Date(),
    };
}

/**
 * Extracts source ID from FeverUp URL.
 */
function extractSourceId(url: string): string {
    const match = url.match(/\/m\/(\d+)/);
    return match ? match[1] : url;
}

/**
 * Polite delay utility for rate limiting.
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
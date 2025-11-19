import puppeteer, { Browser, Page } from 'puppeteer';
import { NormalisedEvent } from '../types';

// Category URLs for Arts Centre Melbourne
const CATEGORY_URLS = [
    { url: 'https://www.artscentremelbourne.com.au/whats-on/classical-music', category: 'music', subcategory: 'Classical Music' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/contemporary-music', category: 'music', subcategory: 'Contemporary Music' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/opera', category: 'theatre', subcategory: 'Opera' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/comedy', category: 'arts', subcategory: 'Comedy' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/circus-and-magic', category: 'arts', subcategory: 'Circus & Magic' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/theatre', category: 'theatre', subcategory: 'Theatre' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/musicals', category: 'theatre', subcategory: 'Musicals' },
    { url: 'https://www.artscentremelbourne.com.au/whats-on/dance', category: 'arts', subcategory: 'Dance' },
];

interface EventListingRaw {
    title: string;
    url: string;
    imageUrl?: string;
    category: string;
    subcategory: string;
}

interface EventDetailRaw {
    description?: string;
    venue?: string;
    priceMin?: number;
    priceMax?: number;
    dates: Date[];
    runningTime?: string;
    ageRecommendation?: string;
}

interface ScrapeOptions {
    maxCategories ?: number;
    maxEventsPerCategory ?: number;
    specificCategories ?: string[]; // NEW: Allow targeting specific categories
}

// Update scrapeArtsCentre to support specific categories
export async function scrapeArtsCentre(options?: ScrapeOptions): Promise<NormalisedEvent[]> {
    console.log('🎭 Scraping Arts Centre Melbourne (by category)...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        // NEW: Support for specific categories
        let categoriesToScrape = CATEGORY_URLS;

        if (options?.specificCategories && options.specificCategories.length > 0) {
            // Filter to only the specified categories
            categoriesToScrape = CATEGORY_URLS.filter(cat =>
                options.specificCategories!.includes(cat.subcategory)
            );
            console.log(`   📋 Scraping specific categories: ${options.specificCategories.join(', ')}...`);
        } else if (options?.maxCategories) {
            // Use slice for limiting
            categoriesToScrape = CATEGORY_URLS.slice(0, options.maxCategories);
            console.log(`   📋 Scraping ${categoriesToScrape.length} of ${CATEGORY_URLS.length} categories...`);
        } else {
            console.log(`   📋 Scraping all ${CATEGORY_URLS.length} categories...`);
        }

        // Rest of the function stays the same...
        const allListings = await scrapeAllCategories(browser, categoriesToScrape, options?.maxEventsPerCategory);
        console.log(`   📋 Found ${allListings.length} unique events across all categories`);

        const uniqueListings = deduplicateEvents(allListings);
        console.log(`   ✨ After deduplication: ${uniqueListings.length} unique events`);

        const detailedEvents = await scrapeEventDetails(browser, uniqueListings);
        console.log(`   ✅ Successfully scraped ${detailedEvents.length} events with full details`);

        await browser.close();

        const now = new Date();
        const upcoming = detailedEvents.filter(e => e.startDate >= now);
        console.log(`   📅 Returning ${upcoming.length} upcoming events`);

        return upcoming;

    } catch (error) {
        console.error('❌ Arts Centre scraping error:', error);
        await browser.close();
        throw error;
    }
}

/**
 * Scrape all category pages in parallel
 */
async function scrapeAllCategories(
    browser: Browser,
    categories: typeof CATEGORY_URLS,
    maxEventsPerCategory?: number
): Promise<EventListingRaw[]> {
    console.log(`   🔄 Scraping ${categories.length} categories in parallel...`);

    const results = await Promise.all(
        categories.map(cat => scrapeCategoryPage(browser, cat, maxEventsPerCategory))
    );

    return results.flat();
}
/**
 * Scrape a single category page with "Load More" support
 * FIXED: Clicks "Load More" button to fetch all events
 */
async function scrapeCategoryPage(
    browser: Browser,
    categoryInfo: { url: string; category: string; subcategory: string },
    maxEvents?: number
): Promise<EventListingRaw[]> {
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        console.log(`   🔍 Loading ${categoryInfo.subcategory}...`);

        await page.goto(categoryInfo.url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for React to render event tiles
        try {
            await page.waitForFunction(
                () => {
                    const loadingDiv = document.querySelector('[data-testid="loading"]');
                    const isLoading = loadingDiv && loadingDiv.textContent === 'LOADING';

                    if (isLoading) return false;

                    const eventTiles = document.querySelectorAll('[data-testid="event-tile"]');
                    return eventTiles.length > 0;
                },
                {
                    timeout: 30000,
                    polling: 500
                }
            );

            console.log(`   ✓ React loaded for ${categoryInfo.subcategory}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e) {
            console.log(`   ⚠️  Timeout waiting for ${categoryInfo.subcategory}`);
        }

        // Check if we have events
        const hasEvents = await page.evaluate(() => {
            return document.querySelectorAll('[data-testid="event-tile"]').length > 0;
        });

        if (!hasEvents) {
            console.log(`   ⚠️  No events found in ${categoryInfo.subcategory}`);
            await page.close();
            return [];
        }

        // Click "Load More" button until all events are loaded (if not limiting)
        if (!maxEvents) {
            await loadAllEvents(page, categoryInfo.subcategory);
        }

        // Extract event listings
        const events = await page.evaluate((cat, subcat, max) => {
            const results: any[] = [];
            const tiles = document.querySelectorAll('[data-testid="event-tile"]');

            tiles.forEach((tile, index) => {
                if (max && index >= max) return;

                const titleLink = tile.querySelector('.title a');
                if (!titleLink) return;

                const title = titleLink.textContent?.trim() || '';
                const url = (titleLink as HTMLAnchorElement)?.href || '';

                const imgEl = tile.querySelector('.event-tile__img img, img');
                let imageUrl = '';

                if (imgEl) {
                    imageUrl = (imgEl as HTMLImageElement).src || '';

                    if (!imageUrl) {
                        const srcset = (imgEl as HTMLImageElement).srcset;
                        if (srcset) {
                            const match = srcset.match(/([^\s,]+)/);
                            imageUrl = match ? match[1] : '';
                        }
                    }
                }

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `https://www.artscentremelbourne.com.au${imageUrl}`;
                }

                if (title && url && /\/whats-on\/\d{4}\//.test(url)) {
                    results.push({
                        title,
                        url,
                        imageUrl: imageUrl || undefined,
                        category: cat,
                        subcategory: subcat,
                    });
                }
            });

            return results;
        }, categoryInfo.category, categoryInfo.subcategory, maxEvents);

        const limitMsg = maxEvents ? ` (limited to ${maxEvents})` : '';
        console.log(`   ✓ ${categoryInfo.subcategory}: ${events.length} events${limitMsg}`);
        await page.close();
        return events;

    } catch (error) {
        console.error(`   ❌ Error scraping ${categoryInfo.subcategory}:`, error);
        await page.close();
        return [];
    }
}

/**
 * Click "Load More" button repeatedly until all events are loaded
 */
async function loadAllEvents(page: Page, subcategory: string): Promise<void> {
    let clickCount = 0;
    const MAX_CLICKS = 20; // Safety limit to prevent infinite loops

    while (clickCount < MAX_CLICKS) {
        try {
            // Check if "Load More" button exists and is visible
            const loadMoreButton = await page.evaluate(() => {
                // Common selectors for "Load More" button
                const selectors = [
                    '.load-more-events',
                    'button.load-more',
                    '[class*="load-more"]',
                    '[class*="Load-More"]',
                    'button[class*="show-more"]',
                    'a[class*="load-more"]',
                ];

                for (const selector of selectors) {
                    const button = document.querySelector(selector);
                    if (button && (button as HTMLElement).offsetParent !== null) {
                        // Button exists and is visible
                        return {
                            selector,
                            text: button.textContent?.trim(),
                        };
                    }
                }

                return null;
            });

            if (!loadMoreButton) {
                // No more "Load More" button - all events loaded
                if (clickCount > 0) {
                    console.log(`   📦 Loaded all events for ${subcategory} (clicked ${clickCount} times)`);
                }
                break;
            }

            // Count events before clicking
            const eventsBefore = await page.evaluate(() => {
                return document.querySelectorAll('[data-testid="event-tile"]').length;
            });

            // Click the button
            await page.click(loadMoreButton.selector);
            clickCount++;

            // Wait for new events to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Wait for event count to increase or timeout
            try {
                await page.waitForFunction(
                    (beforeCount) => {
                        const afterCount = document.querySelectorAll('[data-testid="event-tile"]').length;
                        return afterCount > beforeCount;
                    },
                    { timeout: 5000 },
                    eventsBefore
                );
            } catch (e) {
                // If count didn't increase, we might be at the end
                console.log(`   ℹ️  No new events loaded after click ${clickCount}`);
                break;
            }

            const eventsAfter = await page.evaluate(() => {
                return document.querySelectorAll('[data-testid="event-tile"]').length;
            });

            console.log(`   ⏬ Load More (${clickCount}): ${eventsBefore} → ${eventsAfter} events`);

        } catch (error) {
            // Button not found or error clicking - likely all events loaded
            console.log(`   ℹ️  Finished loading events for ${subcategory} (${clickCount} clicks)`);
            break;
        }
    }

    if (clickCount >= MAX_CLICKS) {
        console.log(`   ⚠️  Reached max clicks (${MAX_CLICKS}) for ${subcategory}`);
    }
}

/**
 * Deduplicate events by URL
 */
function deduplicateEvents(events: EventListingRaw[]): EventListingRaw[] {
    const seen = new Map<string, EventListingRaw>();

    events.forEach(event => {
        if (!seen.has(event.url)) {
            seen.set(event.url, event);
        }
    });

    return Array.from(seen.values());
}

/**
 * Scrape detailed information from individual event pages (in batches)
 */
async function scrapeEventDetails(
    browser: Browser,
    listings: EventListingRaw[]
): Promise<NormalisedEvent[]> {
    console.log(`   📄 Scraping detailed pages (batches of 5)...`);

    const BATCH_SIZE = 5;
    const results: NormalisedEvent[] = [];

    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
        const batch = listings.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(listing => scrapeEventDetailPage(browser, listing))
        );

        results.push(...batchResults.filter(Boolean) as NormalisedEvent[]);
        console.log(`   Progress: ${Math.min(i + BATCH_SIZE, listings.length)}/${listings.length} events`);

        // Small delay between batches to be respectful
        if (i + BATCH_SIZE < listings.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}

/**
 * Scrape a single event detail page
 */
async function scrapeEventDetailPage(
    browser: Browser,
    listing: EventListingRaw
): Promise<NormalisedEvent | null> {
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(listing.url, { waitUntil: 'networkidle2', timeout: 20000 });

        const details = await page.evaluate(() => {
            const result: any = {};

            // Description - from debug: .event-description selector works
            const descEl = document.querySelector('.event-description');
            result.description = descEl?.textContent?.trim();

            // Venue - from debug: .date-location contains venue info like "From 8 April | Playhouse"
            const locationEl = document.querySelector('.date-location');
            if (locationEl) {
                const locationText = locationEl.textContent?.trim() || '';
                // Extract venue name after the pipe character
                const venueParts = locationText.split('|');
                if (venueParts.length > 1) {
                    result.venue = venueParts[1].trim();
                }
            }

            // Dates - from debug: .event-date-time contains all performance dates
            // Individual dates are in .date class elements
            const dates: string[] = [];
            const dateElements = document.querySelectorAll('.event-date-time .date');
            dateElements.forEach(el => {
                const dateText = el.textContent?.trim();
                if (dateText) dates.push(dateText);
            });
            result.dates = dates;

            // Price range - from debug: prices appear as $69.90 format
            const priceElements = document.querySelectorAll('.event-prices, .ticket-price, .price-special');
            const prices: number[] = [];
            priceElements.forEach(el => {
                const text = el.textContent || '';
                const matches = text.match(/\$(\d+(?:\.\d{2})?)/g);
                if (matches) {
                    matches.forEach(match => {
                        const price = parseFloat(match.replace('$', ''));
                        if (!isNaN(price) && price > 10) { // Filter out small fees
                            prices.push(price);
                        }
                    });
                }
            });
            result.priceMin = prices.length > 0 ? Math.min(...prices) : undefined;
            result.priceMax = prices.length > 0 ? Math.max(...prices) : undefined;

            // Running time
            const runningTimeText = document.body.innerText;
            const runningTimeMatch = runningTimeText.match(/Running Time\s*([^\n]+)/i);
            result.runningTime = runningTimeMatch ? runningTimeMatch[1].trim() : undefined;

            // Age recommendation
            const ageText = document.body.innerText;
            const ageMatch = ageText.match(/(\d+\+|All ages|Recommended for ages \d+-\d+)/i);
            result.ageRecommendation = ageMatch ? ageMatch[1] : undefined;

            return result;
        });

        await page.close();

        // Parse dates and create normalized event
        const parsedDates = parseDates(details.dates);
        const startDate = parsedDates.length > 0 ? parsedDates[0] : new Date();
        const endDate = parsedDates.length > 1 ? parsedDates[parsedDates.length - 1] : undefined;

        const sourceId = extractEventId(listing.url);

        return {
            title: listing.title,
            description: details.description || `${listing.subcategory} at Arts Centre Melbourne`,
            category: listing.category,
            subcategory: listing.subcategory,

            startDate,
            endDate,

            venue: {
                name: details.venue || 'Arts Centre Melbourne',
                address: '100 St Kilda Road',
                suburb: 'Melbourne',
            },

            priceMin: details.priceMin,
            priceMax: details.priceMax,
            isFree: details.priceMin === 0 || details.priceMin === undefined ? false : details.priceMin === 0,

            bookingUrl: listing.url,
            imageUrl: listing.imageUrl,

            source: 'artscentre',
            sourceId,
            scrapedAt: new Date(),
        };

    } catch (error) {
        console.error(`   ⚠️  Failed to scrape details for: ${listing.title}`);
        await page.close();
        return null;
    }
}

/**
 * Parse date strings from event page
 */
function parseDates(dateStrings: string[]): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;

    dateStrings.forEach(dateStr => {
        try {
            // Arts Centre format: "Wednesday 8 Apr" or "Sunday 21 Dec"
            // Remove day of week
            let cleanStr = dateStr
                .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '')
                .trim();

            // Try to parse with current year first
            let parsed = new Date(`${cleanStr} ${currentYear}`);

            // If the date is in the past, try next year
            if (parsed < now) {
                parsed = new Date(`${cleanStr} ${nextYear}`);
            }

            if (!isNaN(parsed.getTime())) {
                dates.push(parsed);
            }
        } catch {
            // Skip invalid dates
        }
    });

    return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Extract event ID from URL
 */
function extractEventId(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || url;
    } catch {
        return url;
    }
}
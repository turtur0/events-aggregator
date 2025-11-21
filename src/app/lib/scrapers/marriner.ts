import { load } from 'cheerio';
import { NormalisedEvent } from './types';
import { mapMarrinerCategory } from '../utils/category-mapper';

const BASE_URL = 'https://marrinergroup.com.au';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' };

interface RawShow {
    url: string;
    title: string;
    dateText: string;
    venue: string;
    description?: string;
    imageUrl?: string;
}

export interface ScrapeOptions {
    maxShows?: number;
    maxDetailFetches?: number;
    usePuppeteer?: boolean;
}

/**
 * Main scraper function
 */
export async function scrapeMarrinerGroup(opts: ScrapeOptions = {}): Promise<NormalisedEvent[]> {
    // Step 1: Get show URLs with Puppeteer (handles lazy loading)
    const showUrls = opts.usePuppeteer !== false
        ? await fetchShowUrls(opts.maxShows || 50)
        : [];

    // Step 2: Fetch details for each show with Cheerio
    const rawShows: RawShow[] = [];
    const fetchLimit = Math.min(opts.maxDetailFetches || showUrls.length, showUrls.length);
    
    for (let i = 0; i < fetchLimit; i++) {
        const raw = await fetchShowDetails(showUrls[i]);
        if (raw) rawShows.push(raw);
        await new Promise(r => setTimeout(r, 800)); // Rate limiting
    }

    // Step 3: Normalize to standard event format
    const events = rawShows
        .map(toNormalisedEvent)
        .filter((e): e is NormalisedEvent => e !== null);

    return events;
}

/**
 * Fetch show URLs using Puppeteer (handles React lazy loading)
 */
async function fetchShowUrls(maxShows: number): Promise<string[]> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/shows`, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
    });

    await new Promise(r => setTimeout(r, 2000));

    const urls = new Set<string>();
    let consecutiveNoChange = 0;
    const maxScrollAttempts = 20;
    let scrollAttempts = 0;

    // Scroll to load all shows
    while (consecutiveNoChange < 4 && scrollAttempts < maxScrollAttempts) {
        const prevSize = urls.size;

        const newUrls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/shows/"]'));
            return links
                .map(a => (a as HTMLAnchorElement).href)
                .filter(href => {
                    const path = href.replace('https://marrinergroup.com.au', '');
                    return path.startsWith('/shows/') && path.length > '/shows/'.length;
                });
        });

        newUrls.forEach(url => urls.add(url));

        if (urls.size === prevSize) {
            consecutiveNoChange++;
        } else {
            consecutiveNoChange = 0;
        }

        await page.evaluate(() => {
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        });

        await new Promise(r => setTimeout(r, 2000));
        scrollAttempts++;

        if (maxShows && urls.size >= maxShows) break;
    }

    await browser.close();

    const urlArray = Array.from(urls);
    return maxShows ? urlArray.slice(0, maxShows) : urlArray;
}

/**
 * Fetch individual show details with Cheerio
 */
async function fetchShowDetails(url: string): Promise<RawShow | null> {
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return null;
        
        const html = await res.text();
        const $ = load(html);

        const title = $('h1').first().text().trim();
        if (!title) return null;

        const dateText = $('.dates').first().text().trim();
        if (!dateText) return null;

        const venue = $('.location').first().text().trim() || extractVenueFromTitle(title);
        const description = $('meta[name="description"]').attr('content')?.trim() || title;

        // Extract image (skip logos)
        let imageUrl: string | undefined;
        imageUrl = $('meta[property="og:image"]').attr('content');
        
        if (!imageUrl) {
            const contentImages = $('img').toArray();
            for (const img of contentImages) {
                const src = $(img).attr('src') || '';
                const alt = $(img).attr('alt') || '';
                
                if (!src.includes('logo') && !src.includes('icon') && !src.includes('nav') &&
                    !alt.toLowerCase().includes('logo')) {
                    imageUrl = src;
                    break;
                }
            }
        }
        
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('/') 
                ? `${BASE_URL}${imageUrl}` 
                : `${BASE_URL}/${imageUrl}`;
        }

        return { url, title, dateText, venue, description, imageUrl };
    } catch (err) {
        return null;
    }
}

/**
 * Extract venue from title (fallback)
 */
function extractVenueFromTitle(title: string): string {
    const venues = ['Princess Theatre', 'Comedy Theatre', 'Regent Theatre', 'Forum Melbourne'];
    for (const venue of venues) {
        if (title.toLowerCase().includes(venue.toLowerCase())) {
            return venue;
        }
    }
    return 'Marriner Venue';
}

/**
 * Convert raw show to normalized event
 */
function toNormalisedEvent(raw: RawShow): NormalisedEvent | null {
    const dates = parseDateRange(raw.dateText);
    if (!dates.startDate) return null;

    const { category, subcategory } = mapMarrinerCategory(raw.title, raw.venue);

    return {
        title: raw.title,
        description: raw.description || raw.title,
        category,
        subcategory,
        startDate: dates.startDate,
        endDate: dates.endDate,
        venue: { 
            name: raw.venue, 
            address: getVenueAddress(raw.venue), 
            suburb: 'Melbourne' 
        },
        priceMin: undefined,
        priceMax: undefined,
        isFree: false,
        bookingUrl: raw.url,
        imageUrl: raw.imageUrl,
        source: 'marriner',
        sourceId: slugify(raw.title),
        scrapedAt: new Date(),
        lastUpdated: new Date(),
    };
}

/**
 * Get venue address
 */
function getVenueAddress(venueName: string): string {
    const addresses: Record<string, string> = {
        'Princess Theatre': '163 Spring St, Melbourne VIC 3000',
        'Regent Theatre': '191 Collins St, Melbourne VIC 3000',
        'Comedy Theatre': '240 Exhibition St, Melbourne VIC 3000',
        'Forum Melbourne': '154 Flinders St, Melbourne VIC 3000',
    };
    return addresses[venueName] || 'Melbourne CBD';
}

/**
 * Parse date range
 * Formats: "15 Nov 2025 — 25 Nov 2025", "21 Nov 2025", "22 & 23 Nov 2025"
 */
function parseDateRange(text: string): { startDate: Date | null; endDate?: Date } {
    if (!text || text === 'TBA') return { startDate: null };
    
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    
    // Handle "&" separator (e.g., "22 & 23 Nov 2025")
    if (text.includes('&')) {
        const parts = text.split('&').map(p => p.trim());
        
        if (/^\d{1,2}$/.test(parts[0]) && parts[1]) {
            const firstDay = parts[0];
            const secondTokens = parts[1].trim().split(/\s+/);
            
            if (secondTokens.length >= 3) {
                const secondDay = secondTokens[0];
                const month = secondTokens[1];
                const yearStr = secondTokens[2];
                
                const firstDate = parseDate(`${firstDay} ${month} ${yearStr}`, parseInt(yearStr), parseInt(yearStr) + 1);
                const secondDate = parseDate(`${secondDay} ${month} ${yearStr}`, parseInt(yearStr), parseInt(yearStr) + 1);
                
                return { startDate: firstDate, endDate: secondDate ?? undefined };
            }
        }
        
        const firstDate = parseDate(parts[0], year, nextYear);
        const secondDate = parseDate(parts[1], year, nextYear);
        return { startDate: firstDate, endDate: secondDate ?? undefined };
    }
    
    // Handle em dash or hyphen separator
    const parts = text.split(/\s*[—–\-]\s*/).map(p => p.trim());
    const startDate = parseDate(parts[0], year, nextYear);
    const endDate = parts[1] ? parseDate(parts[1], year, nextYear) : undefined;
    
    return { startDate, endDate: endDate ?? undefined };
}

/**
 * Parse single date string
 */
function parseDate(dateStr: string, currentYear: number, nextYear: number): Date | null {
    if (!dateStr) return null;
    
    let d = new Date(dateStr);
    
    if (isNaN(d.getTime()) && !dateStr.match(/\d{4}/)) {
        d = new Date(`${dateStr} ${currentYear}`);
        
        if (d < new Date()) {
            d = new Date(`${dateStr} ${nextYear}`);
        }
    }
    
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Create URL-safe slug
 */
function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
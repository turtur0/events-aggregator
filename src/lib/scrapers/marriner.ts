import { load, CheerioAPI } from 'cheerio';
import { NormalisedEvent } from './types';
import { mapMarrinerCategory } from '../utils/category-mapper';

const BASE_URL = 'https://marrinergroup.com.au';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

/** Known venue addresses for Marriner Group theatres */
const VENUE_ADDRESSES: Record<string, string> = {
  'Princess Theatre': '163 Spring St, Melbourne VIC 3000',
  'Regent Theatre': '191 Collins St, Melbourne VIC 3000',
  'Comedy Theatre': '240 Exhibition St, Melbourne VIC 3000',
  'Forum Melbourne': '154 Flinders St, Melbourne VIC 3000',
};

interface RawShow {
  url: string;
  title: string;
  dateText: string;
  venue: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  bookingInfo?: string;
}

export interface ScrapeOptions {
  /** Maximum number of show URLs to collect */
  maxShows?: number;
  /** Maximum number of detail pages to fetch */
  maxDetailFetches?: number;
  /** Whether to use Puppeteer for dynamic content */
  usePuppeteer?: boolean;
}

/**
 * Scrapes events from Marriner Group website.
 * Uses Puppeteer to handle dynamic content loading.
 * 
 * @param opts - Scraping options
 * @returns Array of normalised events
 */
export async function scrapeMarrinerGroup(opts: ScrapeOptions = {}): Promise<NormalisedEvent[]> {
  console.log('[Marriner] Fetching show URLs');

  const urls = opts.usePuppeteer !== false
    ? await fetchShowUrls(opts.maxShows || 50)
    : [];

  console.log(`[Marriner] Found ${urls.length} unique show URLs`);

  const rawShows: RawShow[] = [];
  const fetchLimit = opts.maxDetailFetches || urls.length;

  for (let i = 0; i < Math.min(fetchLimit, urls.length); i++) {
    const raw = await fetchShowDetails(urls[i]);
    if (raw) {
      rawShows.push(raw);
      console.log(`[Marriner] Processed ${i + 1}/${Math.min(fetchLimit, urls.length)}: ${raw.title}`);
    }
    await delay(800);
  }

  const events = rawShows
    .map(toNormalisedEvent)
    .filter((e): e is NormalisedEvent => e !== null);

  console.log(`[Marriner] Processed ${events.length} events`);
  return events;
}

/**
 * Uses Puppeteer to fetch show URLs from the dynamically loaded shows page.
 * Scrolls to load more content until no new URLs are found.
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
  await page.goto(`${BASE_URL}/shows`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const urls = new Set<string>();
  let noChangeCount = 0;
  let scrollAttempts = 0;

  console.log('[Marriner] Collecting show URLs');

  while (noChangeCount < 4 && scrollAttempts < 20 && urls.size < maxShows * 2) {
    const prevSize = urls.size;

    // Extract show URLs from page
    const found = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/shows/"]'));
      return links
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => h.includes('/shows/') && h !== 'https://marrinergroup.com.au/shows');
    });

    found.forEach(url => urls.add(url));
    noChangeCount = urls.size === prevSize ? noChangeCount + 1 : 0;

    console.log(`[Marriner] Scroll ${scrollAttempts + 1}: ${urls.size} URLs found`);

    // Scroll to load more content
    await page.evaluate(() =>
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
    );
    await delay(2000);
    scrollAttempts++;
  }

  await browser.close();

  const uniqueShows = deduplicateBySlug(Array.from(urls));
  const result = uniqueShows.slice(0, maxShows);

  console.log(
    `[Marriner] Collected ${urls.size} URLs, ${uniqueShows.length} unique shows, taking ${result.length}`
  );

  return result;
}

/**
 * Deduplicates show URLs by extracting and comparing show slugs.
 * Removes date suffixes to identify the same show across multiple dates.
 */
function deduplicateBySlug(urls: string[]): string[] {
  const seenSlugs = new Map<string, string>();

  for (const url of urls) {
    const slug = extractShowSlug(url);
    if (slug && !seenSlugs.has(slug)) {
      seenSlugs.set(slug, url);
    }
  }

  return Array.from(seenSlugs.values());
}

/**
 * Extracts the show slug from a URL, removing date-specific suffixes.
 */
function extractShowSlug(url: string): string {
  try {
    const path = new URL(url).pathname;
    const lastSegment = path.split('/').pop() || '';

    // Remove common date patterns from slugs
    const cleaned = lastSegment
      .replace(/-\d{2,4}$/g, '')
      .replace(/-on-\d+.*$/g, '')
      .replace(/-\d{1,2}-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/gi, '');

    return cleaned;
  } catch {
    return url;
  }
}

/**
 * Fetches and parses details from a single show page.
 */
async function fetchShowDetails(url: string): Promise<RawShow | null> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;

    const $ = load(await res.text());
    const title = $('h1').first().text().trim();
    if (!title) return null;

    const dateText = $('.dates').first().text().trim();
    if (!dateText) return null;

    const venueText = $('h2').first().text().trim();
    const venue = extractVenueFromText(venueText) || extractVenueFromTitle(title);

    const descParagraphs = $('.description p')
      .map((_, el) => $(el).text().trim())
      .get();

    const description = descParagraphs
      .filter(p => p.length > 0 && !p.startsWith('---'))
      .join('\n\n')
      .substring(0, 1500);

    const videoUrl = $('.videos iframe').first().attr('src');
    const bookingInfo = $('.info').text().trim().substring(0, 500);
    const imageUrl = extractImage($);

    return {
      url,
      title,
      dateText,
      venue,
      description,
      imageUrl,
      videoUrl,
      bookingInfo
    };
  } catch (error) {
    console.error(`[Marriner] Failed to fetch ${url}:`, error);
    return null;
  }
}

/**
 * Attempts to extract venue name from descriptive text.
 */
function extractVenueFromText(text: string): string | null {
  const match = text.match(/at\s+(?:the\s+)?(.+?),?\s*Melbourne/i);
  if (match) return match[1].trim();

  const venues = ['Princess Theatre', 'Comedy Theatre', 'Regent Theatre', 'Forum Melbourne'];
  for (const venue of venues) {
    if (text.toLowerCase().includes(venue.toLowerCase())) {
      return venue;
    }
  }

  return null;
}

/**
 * Extracts venue name from the show title as a fallback.
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
 * Extracts the best available image from the page.
 * Prefers Open Graph image, falls back to content images.
 */
function extractImage($: CheerioAPI): string | undefined {
  let img = $('meta[property="og:image"]').attr('content');

  if (!img) {
    const contentImgs = $('img').toArray();
    for (const el of contentImgs) {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';

      // Skip logos and icons
      if (!src.includes('logo') && !src.includes('icon') &&
        !alt.toLowerCase().includes('logo')) {
        img = src;
        break;
      }
    }
  }

  // Ensure absolute URL
  if (img && !img.startsWith('http')) {
    img = `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
  }

  return img;
}

/**
 * Converts raw show data to normalised event format.
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
      address: VENUE_ADDRESSES[raw.venue] || 'Melbourne CBD',
      suburb: 'Melbourne'
    },
    isFree: false,
    bookingUrl: raw.url,
    imageUrl: raw.imageUrl,
    videoUrl: raw.videoUrl,
    source: 'marriner',
    sourceId: slugify(raw.title),
    scrapedAt: new Date(),
    lastUpdated: new Date(),
  };
}

/**
 * Parses various date range formats into start and end dates.
 * Handles formats like "12 & 13 April 2025" or "5 May - 15 June 2025".
 */
function parseDateRange(text: string): { startDate: Date | null; endDate?: Date } {
  if (!text || text === 'TBA') return { startDate: null };

  const year = new Date().getFullYear();
  const nextYear = year + 1;

  // Handle "12 & 13 April 2025" format
  if (text.includes('&')) {
    const [first, rest] = text.split('&').map(s => s.trim());
    if (/^\d{1,2}$/.test(first) && rest) {
      const tokens = rest.split(/\s+/);
      if (tokens.length >= 3) {
        const [day, month, yr] = [tokens[0], tokens[1], tokens[2]];
        return {
          startDate: parseDate(`${first} ${month} ${yr}`, year, nextYear),
          endDate: parseDate(`${day} ${month} ${yr}`, year, nextYear) ?? undefined,
        };
      }
    }
  }

  // Handle range format "5 May - 15 June 2025"
  const parts = text.split(/\s*[—–\-]\s*/).map(s => s.trim());
  const start = parseDate(parts[0], year, nextYear);
  const end = parts[1] ? parseDate(parts[1], year, nextYear) : undefined;

  return { startDate: start, endDate: end ?? undefined };
}

/**
 * Parses a date string, inferring year if not provided.
 * If date is in the past, assumes next year.
 */
function parseDate(str: string, year: number, nextYear: number): Date | null {
  if (!str) return null;

  let date = new Date(str);

  // If date is invalid and no year is specified, try adding current year
  if (isNaN(date.getTime()) && !str.match(/\d{4}/)) {
    date = new Date(`${str} ${year}`);

    // If date is in the past, use next year
    if (date < new Date()) {
      date = new Date(`${str} ${nextYear}`);
    }
  }

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Converts text to URL-friendly slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Simple delay utility for rate limiting.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
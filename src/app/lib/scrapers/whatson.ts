// ============================================
// whatson.ts - What's On Melbourne Scraper
// ============================================

import { load } from 'cheerio';
import { NormalisedEvent } from './types';
import { mapWhatsOnCategory } from '../utils/category-mapper';

const BASE_URL = 'https://whatson.melbourne.vic.gov.au';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

interface RawEvent {
  url: string;
  title: string;
  description?: string;
  venue?: string;
  address?: string;
  startDate?: Date;
  endDate?: Date;
  priceMin?: number;
  priceMax?: number;
  isFree: boolean;
  imageUrl?: string;
}

export interface WhatsOnScrapeOptions {
  categories?: string[];
  maxPages?: number;
  maxEventsPerCategory?: number;
}

/**
 * Main scraper function
 */
export async function scrapeWhatsOnMelbourne(
  options: WhatsOnScrapeOptions = {}
): Promise<NormalisedEvent[]> {
  const categories = options.categories || ['theatre', 'music'];
  const maxPages = options.maxPages || 10;
  const allEvents: NormalisedEvent[] = [];

  console.log(`🎭 Scraping What's On Melbourne: ${categories.join(', ')}`);

  for (const category of categories) {
    console.log(`\n📂 Category: ${category}`);
    
    // Step 1: Collect event URLs from all pages
    const eventUrls = await collectEventUrls(category, maxPages);
    console.log(`   Found ${eventUrls.length} event URLs`);

    // Step 2: Fetch details for each event
    const limit = options.maxEventsPerCategory || eventUrls.length;
    const urlsToFetch = eventUrls.slice(0, limit);

    for (let i = 0; i < urlsToFetch.length; i++) {
      const rawEvent = await fetchEventDetails(urlsToFetch[i]);
      
      if (rawEvent) {
        const normalised = toNormalisedEvent(rawEvent, category);
        if (normalised) {
          allEvents.push(normalised);
          console.log(`   ✓ ${i + 1}/${urlsToFetch.length}: ${normalised.title}`);
        }
      }

      // Rate limiting: 1.5 second delay
      if (i < urlsToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  console.log(`\n✅ Scraped ${allEvents.length} total events`);
  return allEvents;
}

/**
 * Collect event URLs from category pages (with pagination)
 */
async function collectEventUrls(category: string, maxPages: number): Promise<string[]> {
  const urls = new Set<string>();
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages && page <= maxPages) {
    try {
      const pageUrl = page === 1 
        ? `${BASE_URL}/tags/${category}`
        : `${BASE_URL}/tags/${category}?page=${page}`;

      const response = await fetch(pageUrl, { headers: HEADERS });
      
      if (!response.ok) {
        console.log(`   ⚠️  Page ${page}: HTTP ${response.status}`);
        break;
      }

      const html = await response.text();
      const $ = load(html);

      // Extract event links from page-preview cards only
      const links = $('.page-preview a.main-link[href*="/things-to-do/"]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter((href): href is string => {
          if (!href) return false;
          const path = href.replace(BASE_URL, '');
          return path.startsWith('/things-to-do/') && 
                 path !== '/things-to-do/' &&
                 !path.includes('/tags/') &&
                 !path.includes('/article/') &&
                 !path.includes('/search');
        })
        .map(href => href.startsWith('http') ? href : `${BASE_URL}${href}`);

      const newUrlsCount = urls.size;
      links.forEach(url => urls.add(url));

      // Check if we found new URLs
      if (urls.size === newUrlsCount) {
        hasMorePages = false;
        console.log(`   ℹ️  No new events on page ${page}, stopping`);
      } else {
        console.log(`   Page ${page}: ${urls.size} total URLs`);
      }

      // Check for pagination (look for "next" link or page numbers)
      const hasNextButton = $('a[rel="next"]').length > 0 || 
                           $('a:contains("Next")').length > 0 ||
                           $(`a:contains("${page + 1}")`).length > 0;
      
      if (!hasNextButton && page > 1) {
        hasMorePages = false;
        console.log(`   ℹ️  No pagination found, stopping at page ${page}`);
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Error fetching page ${page}:`, error);
      hasMorePages = false;
    }
  }

  return Array.from(urls);
}

/**
 * Fetch individual event details
 */
async function fetchEventDetails(url: string): Promise<RawEvent | null> {
  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = load(html);

    // Extract basic info
    const title = $('h1').first().text().trim();
    if (!title) return null;

    const description = 
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('p').first().text().trim().substring(0, 300);

    // Extract venue/location
    const venue = extractVenue($);
    const address = extractAddress($);

    // Extract dates
    const { startDate, endDate } = extractDates($);

    // Extract price info
    const { priceMin, priceMax, isFree } = extractPriceInfo($);

    // Extract image
    const imageUrl = 
      $('meta[property="og:image"]').attr('content') ||
      $('img[src*="things-to-do"]').first().attr('src') ||
      $('img').first().attr('src');

    return {
      url,
      title,
      description,
      venue,
      address,
      startDate,
      endDate,
      priceMin,
      priceMax,
      isFree,
      imageUrl: imageUrl?.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`,
    };

  } catch (error) {
    console.error(`   ❌ Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Extract venue name
 */
function extractVenue($: any): string {
  // Look for location heading or venue class
  const venue = 
    $('h2:contains("Location"), h3:contains("Location")').next().text().trim() ||
    $('[class*="venue"]').first().text().trim() ||
    $('[class*="location"] h3, [class*="location"] h4').first().text().trim() ||
    'Venue TBA';

  return venue.split('\n')[0].trim();
}

/**
 * Extract address
 */
function extractAddress($: any): string {
  const addressText = 
    $('[class*="address"]').first().text().trim() ||
    $('[class*="location"] p').first().text().trim();

  // Clean up address (remove extra whitespace)
  return addressText
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .join(', ')
    .substring(0, 200) || 'Melbourne VIC';
}

/**
 * Extract dates from time elements or date text
 */
function extractDates($: any): { startDate?: Date; endDate?: Date } {
  const timeElements = $('time[datetime]');
  
  if (timeElements.length > 0) {
    const dates = timeElements
      .map((_: any, el: any) => {
        const datetime = $(el).attr('datetime');
        return datetime ? new Date(datetime) : null;
      })
      .get()
      .filter((d: { getTime: () => number; } | null): d is Date => d !== null && !isNaN(d.getTime()));

    if (dates.length > 0) {
      dates.sort((a: { getTime: () => number; }, b: { getTime: () => number; }) => a.getTime() - b.getTime());
      return {
        startDate: dates[0],
        endDate: dates.length > 1 ? dates[dates.length - 1] : undefined,
      };
    }
  }

  // Fallback: look for date text
  const dateText = $('[class*="date"]').first().text().trim();
  if (dateText) {
    const parsed = parseDate(dateText);
    if (parsed) {
      return { startDate: parsed };
    }
  }

  return {};
}

/**
 * Parse date from text (simple parser)
 */
function parseDate(text: string): Date | null {
  try {
    // Try direct parse first
    const date = new Date(text);
    if (!isNaN(date.getTime())) return date;

    // Try with current/next year
    const year = new Date().getFullYear();
    const withYear = `${text} ${year}`;
    const dated = new Date(withYear);
    
    if (!isNaN(dated.getTime())) {
      // If date is in the past, try next year
      if (dated < new Date()) {
        const nextYear = new Date(`${text} ${year + 1}`);
        if (!isNaN(nextYear.getTime())) return nextYear;
      }
      return dated;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract price information
 */
function extractPriceInfo($: any): {
  priceMin?: number;
  priceMax?: number;
  isFree: boolean;
} {
  const priceText = 
    $('h2:contains("Price"), h3:contains("Price")').parent().text() ||
    $('[class*="price"]').text() ||
    '';

  // Check if free
  const isFree = /\bfree\b/i.test(priceText);
  if (isFree) {
    return { priceMin: 0, priceMax: 0, isFree: true };
  }

  // Extract numbers like "$50" or "$50 to $100"
  const priceMatches = priceText.match(/\$(\d+(?:\.\d{2})?)/g);
  
  if (priceMatches && priceMatches.length > 0) {
    const prices = priceMatches
      .map((p: string) => parseFloat(p.replace('$', '')))
      .filter((p: number) => !isNaN(p) && p > 0);

    if (prices.length > 0) {
      return {
        priceMin: Math.min(...prices),
        priceMax: prices.length > 1 ? Math.max(...prices) : undefined,
        isFree: false,
      };
    }
  }

  return { isFree: false };
}

/**
 * Convert raw event to normalised format
 */
function toNormalisedEvent(raw: RawEvent, categoryTag: string): NormalisedEvent | null {
  if (!raw.startDate) return null;

  const { category, subcategory } = mapWhatsOnCategory(categoryTag, raw.title);

  // Extract suburb from address
  const suburb = extractSuburb(raw.address || '');

  return {
    title: raw.title,
    description: raw.description || 'No description available',
    category,
    subcategory,
    startDate: raw.startDate,
    endDate: raw.endDate,
    venue: {
      name: raw.venue || 'Venue TBA',
      address: raw.address || 'Melbourne VIC',
      suburb,
    },
    priceMin: raw.priceMin,
    priceMax: raw.priceMax,
    isFree: raw.isFree,
    bookingUrl: raw.url,
    imageUrl: raw.imageUrl,
    source: 'whatson' as any, // Will need to update types
    sourceId: slugify(raw.title),
    scrapedAt: new Date(),
    lastUpdated: new Date(),
  };
}

/**
 * Extract suburb from address
 */
function extractSuburb(address: string): string {
  const suburbs = [
    'Melbourne', 'Carlton', 'Fitzroy', 'Collingwood', 'Richmond',
    'Southbank', 'St Kilda', 'South Yarra', 'North Melbourne',
    'Port Melbourne', 'Docklands', 'East Melbourne',
  ];

  for (const suburb of suburbs) {
    if (address.includes(suburb)) {
      return suburb;
    }
  }

  return 'Melbourne';
}

/**
 * Create URL-safe slug
 */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
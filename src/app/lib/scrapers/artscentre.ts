/**
 * Arts Centre Melbourne Scraper
 * Uses sitemap + Puppeteer stealth for page data
 *
 * Dependencies:
 * npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth axios cheerio
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';
import { NormalisedEvent } from './types';

puppeteer.use(StealthPlugin());

const SITEMAP_URL = 'https://www.artscentremelbourne.com.au/sitemap.xml';
const BASE_URL = 'https://www.artscentremelbourne.com.au';

const CONFIG = {
    minDelayMs: 4000,
    maxDelayMs: 8000,
    batchSize: 5,
    batchDelayMs: 15000,
    pageTimeoutMs: 30000,
};

interface SitemapEvent {
    url: string;
    lastmod: string;
    category: string;
    subcategory: string;
    year: number;
    slug: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min: number, max: number) => delay(min + Math.random() * (max - min));

// ==========================
// MAIN EXPORT
// ==========================
export async function scrapeArtsCentre(testLimit?: number): Promise<NormalisedEvent[]> {
    console.log('🎭 Arts Centre Melbourne Scraper (Respectful mode enabled)');

    const sitemapEvents = await fetchEventsFromSitemapWithPuppeteer();
    console.log(`📋 Found ${sitemapEvents.length} events in sitemap\n`);

    if (!sitemapEvents.length) return [];

    const currentYear = new Date().getFullYear();
    const futureEvents = sitemapEvents.filter(e => e.year >= currentYear);
    if (!futureEvents.length) return [];

    const toScrape = testLimit ? futureEvents.slice(0, testLimit) : futureEvents;
    if (testLimit) console.log(`🧪 TEST MODE: Processing ${toScrape.length} events\n`);

    return scrapeWithStealth(toScrape);
}

// ==========================
// SITEMAP FETCHING
// ==========================
async function fetchEventsFromSitemapWithPuppeteer(): Promise<SitemapEvent[]> {
    console.log('🌐 Fetching sitemap using Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-infobars', '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = await browser.newPage();
    await setupStealthPage(page);
    await page.goto(SITEMAP_URL, { waitUntil: 'networkidle2', timeout: CONFIG.pageTimeoutMs });
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    await browser.close();

    const events: SitemapEvent[] = [];
    const $ = cheerio.load(html, { xmlMode: true });
    $('url').each((_, elem) => {
        const url = $(elem).find('loc').text().trim();
        const lastmod = $(elem).find('lastmod').text().trim();
        processUrl(url, lastmod, events);
    });

    console.log(`👉 Total events collected from sitemap: ${events.length}`);
    return events.sort((a, b) => a.year - b.year);
}

function processUrl(url: string, lastmod: string, events: SitemapEvent[]) {
    if (!url.includes('/whats-on/')) return;

    const yearMatch = url.match(/\/(20\d{2})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    const slug = url.split('/').filter(Boolean).pop()!;
    const category = guessCategoryFromUrl(url);

    events.push({ url, lastmod, year, slug, ...category });
}

function guessCategoryFromUrl(url: string) {
    const map: Record<string, { category: string; subcategory: string }> = {
        'classical-music': { category: 'music', subcategory: 'Classical Music' },
        'contemporary-music': { category: 'music', subcategory: 'Contemporary Music' },
        'opera': { category: 'theatre', subcategory: 'Opera' },
        'comedy': { category: 'arts', subcategory: 'Comedy' },
        'circus-and-magic': { category: 'arts', subcategory: 'Circus & Magic' },
        'musicals': { category: 'theatre', subcategory: 'Musicals' },
        'musical': { category: 'theatre', subcategory: 'Musicals' },
        'dance': { category: 'arts', subcategory: 'Dance' },
        'theatre': { category: 'theatre', subcategory: 'Theatre' },
        'kids-and-families': { category: 'family', subcategory: 'Kids & Families' },
        'exhibitions': { category: 'arts', subcategory: 'Exhibitions' },
        'talks-and-ideas': { category: 'arts', subcategory: 'Talks & Ideas' },
        'festivals-and-series': { category: 'arts', subcategory: 'Festival' },
        'seasons': { category: 'arts', subcategory: 'Season' },
        'schools-and-teachers': { category: 'education', subcategory: 'Schools' },
        'ampa': { category: 'arts', subcategory: 'AMPA' },
    };

    for (const key in map) if (url.includes(key)) return map[key];
    return { category: 'arts', subcategory: 'General' };
}

// ==========================
// PUPPETEER STEALTH SCRAPING
// ==========================
async function scrapeWithStealth(sitemapEvents: SitemapEvent[]): Promise<NormalisedEvent[]> {
    console.log('🌐 Launching stealth browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-infobars', '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const events: NormalisedEvent[] = [];
    try {
        const page = await browser.newPage();
        await setupStealthPage(page);

        for (let i = 0; i < sitemapEvents.length; i++) {
            const sitemap = sitemapEvents[i];
            const progress = `[${i + 1}/${sitemapEvents.length}]`;

            let event: NormalisedEvent | null = null;
            try {
                event = await scrapePage(page, sitemap);
            } catch {
                event = createFallbackEvent(sitemap, 'sitemap-fallback');
            }

            events.push(event);

            const modeIcon = event.scrapeMode === 'react-page' ? '✅'
                : event.scrapeMode === 'captcha-blocked' ? '🔐' : '⚠️';

            console.log(`${modeIcon} ${progress} [${event.scrapeMode}] ${event.title} ${event.fallback ? '(fallback)' : ''}`);

            if (i < sitemapEvents.length - 1) {
                await randomDelay(CONFIG.minDelayMs, CONFIG.maxDelayMs);
                if ((i + 1) % CONFIG.batchSize === 0) await randomDelay(CONFIG.batchDelayMs, CONFIG.batchDelayMs + 5000);
            }
        }
    } finally {
        await browser.close();
    }

    return events;
}

async function setupStealthPage(page: Page) {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-AU,en;q=0.9' });

    await page.setRequestInterception(true);
    page.on('request', req => {
        ['image', 'stylesheet', 'font', 'media'].includes(req.resourceType()) ? req.abort() : req.continue();
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
        if (!(window as any).chrome) (window as any).chrome = { runtime: {} };
    });
}

async function scrapePage(page: Page, sitemap: SitemapEvent): Promise<NormalisedEvent> {
    await page.goto(sitemap.url, { waitUntil: 'networkidle2', timeout: CONFIG.pageTimeoutMs });

    const captchaDetected = await detectCaptcha(page);
    if (captchaDetected) return createFallbackEvent(sitemap, 'captcha-blocked');

    await page.waitForSelector('h1, [class*="event"]', { timeout: 10000 }).catch(() => { });
    await delay(1000);

    const data = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const json = JSON.parse(script.textContent || '{}');
                if (json['@type'] === 'Event' || json.startDate) {
                    return {
                        title: json.name,
                        description: json.description,
                        startDate: json.startDate,
                        endDate: json.endDate,
                        venue: json.location?.name,
                        priceMin: json.offers?.lowPrice ? parseFloat(json.offers.lowPrice) : null,
                        priceMax: json.offers?.highPrice ? parseFloat(json.offers.highPrice) : null,
                        image: json.image?.url || json.image,
                    };
                }
            } catch { }
        }

        const title = document.querySelector('h1')?.textContent?.trim();
        const desc = document.querySelector('[class*="description"]')?.textContent?.trim() ||
            document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content');

        const dateEls = document.querySelectorAll('time, [datetime], [class*="date"]');
        const dates: string[] = [];
        dateEls.forEach(el => {
            const d = el.getAttribute('datetime') || el.textContent?.trim();
            if (d && d.length > 4) dates.push(d);
        });

        const priceText = document.body.innerText.match(/\$(\d+(?:\.\d{2})?)/g) || [];
        const prices = priceText.map(p => parseFloat(p.replace('$', ''))).filter(p => p > 0 && p < 1000);

        return {
            title,
            description: desc,
            startDate: dates[0],
            endDate: dates.length > 1 ? dates[dates.length - 1] : null,
            venue: document.querySelector('[class*="venue"]')?.textContent?.trim(),
            priceMin: prices.length ? Math.min(...prices) : null,
            priceMax: prices.length ? Math.max(...prices) : null,
            image: img,
        };
    });

    const now = new Date();
    if (!data?.title) return createFallbackEvent(sitemap, 'sitemap-fallback');

    return {
        title: data.title,
        description: data.description || `${sitemap.subcategory} at Arts Centre Melbourne`,
        category: sitemap.category,
        subcategory: sitemap.subcategory,
        startDate: data.startDate ? new Date(data.startDate) : estimateDateFromYear(sitemap.year),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        venue: { name: data.venue || 'Arts Centre Melbourne', address: '100 St Kilda Road', suburb: 'Melbourne' },
        priceMin: data.priceMin ?? undefined,
        priceMax: data.priceMax ?? undefined,
        isFree: data.priceMin === 0,
        bookingUrl: sitemap.url,
        imageUrl: data.image?.startsWith('http') ? data.image : data.image ? BASE_URL + data.image : undefined,
        source: 'artscentre',
        sourceId: sitemap.slug,
        scrapedAt: now,
        lastUpdated: now,
        scrapeMode: 'react-page',
        fallback: false,
    };
}

// ==========================
// CAPTCHA DETECTION
// ==========================
async function detectCaptcha(page: Page): Promise<boolean> {
    const captcha = await page.$('[class*="captcha"], input[name*="captcha"], [id*="captcha"]');
    if (!captcha) return false;

    console.log('🔐 CAPTCHA detected on page');
    return true;
}

// ==========================
// FALLBACK
// ==========================
function createFallbackEvent(sitemap: SitemapEvent, mode: 'captcha-blocked' | 'sitemap-fallback'): NormalisedEvent {
    const now = new Date();
    return {
        title: slugToTitle(sitemap.slug),
        description: `${sitemap.subcategory} at Arts Centre Melbourne`,
        category: sitemap.category,
        subcategory: sitemap.subcategory,
        startDate: estimateDateFromYear(sitemap.year),
        endDate: undefined,
        venue: { name: 'Arts Centre Melbourne', address: '100 St Kilda Road', suburb: 'Melbourne' },
        priceMin: undefined,
        priceMax: undefined,
        isFree: false,
        bookingUrl: sitemap.url,
        imageUrl: undefined,
        source: 'artscentre',
        sourceId: sitemap.slug,
        scrapedAt: now,
        lastUpdated: now,
        scrapeMode: mode,
        fallback: true,
    };
}

function slugToTitle(slug: string): string {
    const abbrevs: Record<string, string> = { mso: 'MSO', aco: 'ACO', mtc: 'MTC', vo: 'Victorian Opera', tab: 'The Australian Ballet', oa: 'Opera Australia' };
    return slug.split('-').map(w => abbrevs[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function estimateDateFromYear(year: number): Date {
    return new Date(year, 5, 15);
}

import { NormalisedEvent, ScrapeResult } from './types';
import { fetchAllTicketmasterEvents, normaliseTicketmasterEvent } from './ticketmaster';
import { scrapeMarrinerGroup } from './marriner';
import { scrapeWhatsOnMelbourne, WhatsOnScrapeOptions } from './whatson';
import { scrapeFeverUpMelbourne, FeverUpScrapeOptions } from './feverup';

export { fetchAllTicketmasterEvents, normaliseTicketmasterEvent } from './ticketmaster';
export { scrapeMarrinerGroup } from './marriner';
export { scrapeWhatsOnMelbourne } from './whatson';
export { scrapeFeverUpMelbourne } from './feverup';
export type { WhatsOnScrapeOptions } from './whatson';
export type { FeverUpScrapeOptions } from './feverup';

interface ScrapeAllOptions {
  /** Which sources to scrape from */
  sources?: ('ticketmaster' | 'marriner' | 'whatson' | 'feverup')[];
  /** Enable detailed console logging */
  verbose?: boolean;
  /** Run scrapers in parallel or sequentially */
  parallel?: boolean;
  /** Options specific to Marriner scraper */
  marrinerOptions?: {
    maxShows?: number;
    maxDetailFetches?: number;
    usePuppeteer?: boolean;
  };
  /** Options specific to WhatsOn scraper */
  whatsonOptions?: WhatsOnScrapeOptions;
  /** Options specific to FeverUp scraper */
  feverupOptions?: FeverUpScrapeOptions;
}

/**
 * Orchestrates scraping from multiple event sources.
 * 
 * @param options - Configuration for scraping behaviour
 * @returns Combined events and individual scrape results
 */
export async function scrapeAll(
  options?: ScrapeAllOptions
): Promise<{ events: NormalisedEvent[]; results: ScrapeResult[] }> {
  const sources = options?.sources || ['ticketmaster', 'marriner', 'whatson', 'feverup'];
  const verbose = options?.verbose ?? true;
  const parallel = options?.parallel ?? true;

  const results: ScrapeResult[] = [];
  const allEvents: NormalisedEvent[] = [];

  if (verbose) {
    console.log('[Scraper] Starting scrape');
    console.log(`[Scraper] Sources: ${sources.join(', ')}`);
    console.log(`[Scraper] Mode: ${parallel ? 'parallel' : 'sequential'}`);
  }

  // Build task list based on selected sources
  const tasks: { name: string; fn: () => Promise<ScrapeResult> }[] = [];

  if (sources.includes('ticketmaster')) {
    tasks.push({ name: 'ticketmaster', fn: () => scrapeTicketmaster(verbose) });
  }
  if (sources.includes('marriner')) {
    tasks.push({
      name: 'marriner',
      fn: () => scrapeMarriner(verbose, options?.marrinerOptions),
    });
  }
  if (sources.includes('whatson')) {
    tasks.push({
      name: 'whatson',
      fn: () => scrapeWhatsOn(verbose, options?.whatsonOptions),
    });
  }
  if (sources.includes('feverup')) {
    tasks.push({
      name: 'feverup',
      fn: () => scrapeFeverUp(verbose, options?.feverupOptions),
    });
  }

  // Execute tasks
  if (parallel) {
    const settled = await Promise.allSettled(tasks.map(t => t.fn()));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        allEvents.push(...result.value.events);
      } else {
        console.error(`[${tasks[index].name}] Failed:`, result.reason);
      }
    });
  } else {
    for (const task of tasks) {
      try {
        const result = await task.fn();
        results.push(result);
        allEvents.push(...result.events);
      } catch (error) {
        console.error(`[${task.name}] Failed:`, error);
      }
    }
  }

  if (verbose) {
    console.log('[Scraper] Summary:');
    results.forEach(r => {
      console.log(
        `[${r.stats.source}] ${r.stats.normalised} events in ${(r.stats.duration / 1000).toFixed(1)}s`
      );
    });
    console.log(`[Scraper] Total: ${allEvents.length} events`);
  }

  return { events: allEvents, results };
}

/**
 * Scrapes events from Ticketmaster API.
 */
async function scrapeTicketmaster(verbose: boolean): Promise<ScrapeResult> {
  const start = Date.now();
  const stats = {
    source: 'ticketmaster',
    fetched: 0,
    normalised: 0,
    errors: 0,
    duration: 0,
  };

  if (verbose) console.log('[Ticketmaster] Starting scrape');

  try {
    const rawEvents = await fetchAllTicketmasterEvents();
    stats.fetched = rawEvents.length;

    const events: NormalisedEvent[] = [];
    for (const raw of rawEvents) {
      try {
        events.push(normaliseTicketmasterEvent(raw));
        stats.normalised++;
      } catch {
        stats.errors++;
        if (verbose) console.error(`[Ticketmaster] Failed to normalise: ${raw.name}`);
      }
    }

    if (verbose) console.log(`[Ticketmaster] Complete: ${stats.normalised} events`);

    stats.duration = Date.now() - start;
    return { events, stats };
  } catch (error) {
    if (verbose) console.error('[Ticketmaster] Error:', error);
    stats.errors++;
    stats.duration = Date.now() - start;
    return { events: [], stats };
  }
}

/**
 * Scrapes events from Marriner Group website.
 */
async function scrapeMarriner(
  verbose: boolean,
  options?: { maxShows?: number; maxDetailFetches?: number; usePuppeteer?: boolean }
): Promise<ScrapeResult> {
  const start = Date.now();
  const stats = {
    source: 'marriner',
    fetched: 0,
    normalised: 0,
    errors: 0,
    duration: 0,
  };

  if (verbose) console.log('[Marriner] Starting scrape');

  try {
    const events = await scrapeMarrinerGroup({
      maxShows: options?.maxShows ?? 100,
      maxDetailFetches: options?.maxDetailFetches ?? 100,
      usePuppeteer: options?.usePuppeteer ?? true,
    });

    stats.fetched = events.length;
    stats.normalised = events.length;

    if (verbose) console.log(`[Marriner] Complete: ${stats.normalised} events`);

    stats.duration = Date.now() - start;
    return { events, stats };
  } catch (error) {
    if (verbose) console.error('[Marriner] Error:', error);
    stats.errors++;
    stats.duration = Date.now() - start;
    return { events: [], stats };
  }
}

/**
 * Scrapes events from What's On Melbourne website.
 */
async function scrapeWhatsOn(
  verbose: boolean,
  options?: WhatsOnScrapeOptions
): Promise<ScrapeResult> {
  const start = Date.now();
  const stats = {
    source: 'whatson',
    fetched: 0,
    normalised: 0,
    errors: 0,
    duration: 0,
  };

  if (verbose) console.log('[WhatsOn] Starting scrape');

  try {
    const defaultOptions: WhatsOnScrapeOptions = {
      categories: ['theatre', 'music'],
      maxPages: 5,
      maxEventsPerCategory: 50,
      fetchDetails: true,
      detailFetchDelay: 1000,
    };

    const events = await scrapeWhatsOnMelbourne({
      ...defaultOptions,
      ...options,
    });

    stats.fetched = events.length;
    stats.normalised = events.length;

    if (verbose) console.log(`[WhatsOn] Complete: ${stats.normalised} events`);

    stats.duration = Date.now() - start;
    return { events, stats };
  } catch (error) {
    if (verbose) console.error('[WhatsOn] Error:', error);
    stats.errors++;
    stats.duration = Date.now() - start;
    return { events: [], stats };
  }
}

/**
 * Scrapes events from FeverUp Melbourne website.
 */
async function scrapeFeverUp(
  verbose: boolean,
  options?: FeverUpScrapeOptions
): Promise<ScrapeResult> {
  const start = Date.now();
  const stats = {
    source: 'feverup',
    fetched: 0,
    normalised: 0,
    errors: 0,
    duration: 0,
  };

  if (verbose) console.log('[FeverUp] Starting scrape');

  try {
    const defaultOptions: FeverUpScrapeOptions = {
      maxEvents: 50,
      fetchDetails: true,
      detailFetchDelay: 1500,
    };

    const events = await scrapeFeverUpMelbourne({
      ...defaultOptions,
      ...options,
    });

    stats.fetched = events.length;
    stats.normalised = events.length;

    if (verbose) console.log(`[FeverUp] Complete: ${stats.normalised} events`);

    stats.duration = Date.now() - start;
    return { events, stats };
  } catch (error) {
    if (verbose) console.error('[FeverUp] Error:', error);
    stats.errors++;
    stats.duration = Date.now() - start;
    return { events: [], stats };
  }
}
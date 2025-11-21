import { NormalisedEvent, ScrapeResult } from './types';
import { fetchAllTicketmasterEvents, normaliseTicketmasterEvent } from './ticketmaster';
import { scrapeArtsCentre } from './artscentre';

export { scrapeArtsCentre } from './artscentre';
export { fetchAllTicketmasterEvents, normaliseTicketmasterEvent } from './ticketmaster';
export * from './types';

interface ScrapeAllOptions {
  sources?: ('ticketmaster' | 'artscentre')[];
  verbose?: boolean;
}

/**
 * Scrape events from all sources (or specified sources)
 */
export async function scrapeAll(options?: ScrapeAllOptions): Promise<{
  events: NormalisedEvent[];
  results: ScrapeResult[];
}> {
  const sources = options?.sources || ['ticketmaster', 'artscentre'];
  const verbose = options?.verbose ?? true;
  const results: ScrapeResult[] = [];
  const allEvents: NormalisedEvent[] = [];

  if (verbose) {
    console.log('🚀 Starting multi-source scrape...');
    console.log(`   Sources: ${sources.join(', ')}\n`);
  }

  // Scrape Ticketmaster
  if (sources.includes('ticketmaster')) {
    const result = await scrapeTicketmaster(verbose);
    results.push(result);
    allEvents.push(...result.events);
  }

  // Scrape Arts Centre
  if (sources.includes('artscentre')) {
    const result = await scrapeArtsCentreSource(verbose);
    results.push(result);
    allEvents.push(...result.events);
  }

  if (verbose) {
    console.log('\n📊 Scrape Summary:');
    results.forEach(r => {
      console.log(`   ${r.stats.source}: ${r.stats.normalised} events (${r.stats.duration}ms)`);
    });
    console.log(`   Total: ${allEvents.length} events`);
  }

  return { events: allEvents, results };
}

/**
 * Scrape Ticketmaster and return normalised events
 */
async function scrapeTicketmaster(verbose: boolean): Promise<ScrapeResult> {
  const start = Date.now();
  let fetched = 0, normalised = 0, errors = 0;

  if (verbose) console.log('🎫 Scraping Ticketmaster...');

  try {
    const rawEvents = await fetchAllTicketmasterEvents();
    fetched = rawEvents.length;

    const events: NormalisedEvent[] = [];
    for (const raw of rawEvents) {
      try {
        events.push(normaliseTicketmasterEvent(raw));
        normalised++;
      } catch (e) {
        errors++;
      }
    }

    if (verbose) console.log(`   ✅ Ticketmaster: ${normalised} events\n`);

    return {
      events,
      stats: { source: 'ticketmaster', fetched, normalised, errors, duration: Date.now() - start }
    };
  } catch (error) {
    console.error('   ❌ Ticketmaster failed:', error);
    return {
      events: [],
      stats: { source: 'ticketmaster', fetched, normalised, errors: 1, duration: Date.now() - start }
    };
  }
}

/**
 * Scrape Arts Centre and return normalised events
 */
async function scrapeArtsCentreSource(verbose: boolean): Promise<ScrapeResult> {
  const start = Date.now();

  if (verbose) console.log('🎭 Scraping Arts Centre...');

  try {
    const events = await scrapeArtsCentre();

    if (verbose) console.log(`   ✅ Arts Centre: ${events.length} events\n`);

    return {
      events,
      stats: {
        source: 'artscentre',
        fetched: events.length,
        normalised: events.length,
        errors: 0,
        duration: Date.now() - start
      }
    };
  } catch (error) {
    console.error('   ❌ Arts Centre failed:', error);
    return {
      events: [],
      stats: { source: 'artscentre', fetched: 0, normalised: 0, errors: 1, duration: Date.now() - start }
    };
  }
}
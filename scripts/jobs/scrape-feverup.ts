import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/lib/db';
import { scrapeFeverUpMelbourne, FeverUpScrapeOptions } from '@/lib/scrapers';
import { processEventsWithDeduplication } from '../utils/scrape-with-dedup';

const DEFAULT_OPTIONS: FeverUpScrapeOptions = {
    maxEvents: 40,
    detailFetchDelay: 1500,
};

/**
 * Scrapes events from FeverUp Melbourne and processes them with deduplication.
 */
export async function scrapeFeverUpWithDedup(customOptions?: FeverUpScrapeOptions) {
    console.log('FeverUp Melbourne scraper starting');

    try {
        await connectDB();

        const options = customOptions || DEFAULT_OPTIONS;
        logScrapeSettings(options);

        const events = await scrapeFeverUpMelbourne(options);
        console.log(`Scraped ${events.length} events from FeverUp`);

        const stats = await processEventsWithDeduplication(events, 'feverup');
        displaySummary(stats, events.length);

        return stats;
    } finally {
        await disconnectDB();
    }
}

function logScrapeSettings(options: FeverUpScrapeOptions) {
    console.log('Scrape settings:');
    console.log(`  Max events: ${options.maxEvents === Infinity ? 'unlimited' : options.maxEvents}`);
    console.log(`  Detail fetch delay: ${options.detailFetchDelay}ms`);
}

function displaySummary(stats: any, total: number) {
    console.log('--------------------------------------------------------');
    console.log('FeverUp Processing Complete');
    console.log('--------------------------------------------------------');
    console.log('Summary:');
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Updated:  ${stats.updated}`);
    console.log(`  Merged:   ${stats.merged}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log(`  Total:    ${total}`);
    console.log('');
}

if (require.main === module) {
    scrapeFeverUpWithDedup()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}
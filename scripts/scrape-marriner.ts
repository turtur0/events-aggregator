// =============================================
// scripts/scrape-marriner.ts
// =============================================
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/lib/db';
import { ScrapeOptions } from '@/lib/scrapers/marriner';
import { scrapeMarrinerGroup } from '@/lib/scrapers';
import { processEventsWithDeduplication } from './scrape-with-dedup';

const SCRAPE_OPTIONS: ScrapeOptions = {
  maxShows: 25,          // Fetch up to 50 shows
  maxDetailFetches: 25,  // Fetch details for all shows
  usePuppeteer: true,    // Use Puppeteer for lazy-loaded /shows page
};

export async function scrapeMarrinerWithDedup() {
  console.log('🎭 Marriner Group Scraper with Deduplication\n');

  try {
    await connectDB();

    // Pass the options to the scraper
    const events = await scrapeMarrinerGroup(SCRAPE_OPTIONS);

    console.log(`\n✅ Scraped ${events.length} events from Marriner`);

    const stats = await processEventsWithDeduplication(events, 'marriner');

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Marriner Processing Complete');
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 Summary:`);
    console.log(`   • Inserted: ${stats.inserted} new events`);
    console.log(`   • Updated:  ${stats.updated} same-source events`);
    console.log(`   • Merged:   ${stats.merged} cross-source duplicates`);
    console.log(`   • Skipped:  ${stats.skipped} errors`);
    console.log(`   • Total:    ${events.length} events processed\n`);

  } finally {
    await disconnectDB();
  }
}

// Allow running directly
if (require.main === module) {
  scrapeMarrinerWithDedup()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Fatal error:', err);
      process.exit(1);
    });
}
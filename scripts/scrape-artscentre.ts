/**
 * Arts Centre Melbourne Scraper Runner
 * Connects to MongoDB, scrapes events, and saves them
 */

import dotenv from 'dotenv';
import path from 'path';
import { connectDB, disconnectDB } from '../src/app/lib/db';
import { scrapeArtsCentre } from '../src/app/lib/scrapers/artscentre';
import Event from '@/app/lib/models/Event';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('╔════════════════════════════════╗');
  console.log('║  Arts Centre Melbourne Scraper ║');
  console.log('╠════════════════════════════════╣');
  console.log('║ Respectful scraping enabled:   ║');
  console.log('║ • 4-8 second delays between pages ║');
  console.log('║ • 15 second batch pauses          ║');
  console.log('║ • Single concurrent request       ║');
  console.log('║ • Stealth browser (anti-detection)║');
  console.log('╚════════════════════════════════╝\n');

  // Parse CLI args for test mode
  const args = process.argv.slice(2);
  let testLimit: number | undefined;

  if (args.includes('--test')) testLimit = 10;
  const testArg = args.find(a => a.startsWith('--test='));
  if (testArg) testLimit = parseInt(testArg.split('=')[1]) || 10;

  try {
    console.log('📦 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected\n');

    console.log('🌐 Starting scraper...');
    const startTime = Date.now();
    const events = await scrapeArtsCentre(testLimit);
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n📊 Scraped ${events.length} events in ${duration} minutes\n`);

    if (!events.length) {
      console.log('⚠️  No events to save');
      return;
    }

    console.log('💾 Saving to database...\n');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        const existing = await Event.findOne({ source: event.source, sourceId: event.sourceId });
        if (existing) {
          const hasChanges =
            existing.title !== event.title ||
            existing.startDate?.getTime() !== event.startDate?.getTime() ||
            existing.description !== event.description;

          if (hasChanges) {
            await Event.updateOne({ _id: existing._id }, { ...event, lastUpdated: new Date() });
            updated++;
          } else skipped++;
        } else {
          await Event.create(event);
          inserted++;
        }
      } catch (err: any) {
        console.log(`⚠️  DB error for ${event.sourceId}: ${err.message}`);
        skipped++;
      }
    }

    console.log('╔════════════════════════════════╗');
    console.log('║           Results              ║');
    console.log('╠════════════════════════════════╣');
    console.log(`║ ✅ Inserted: ${String(inserted).padEnd(15)}║`);
    console.log(`║ 🔄 Updated:  ${String(updated).padEnd(15)}║`);
    console.log(`║ ⏭️  Skipped:  ${String(skipped).padEnd(15)}║`);
    console.log(`║ 📊 Total:    ${String(events.length).padEnd(15)}║`);
    console.log('╚════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('❌ Scraper error:', error.message || error);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();

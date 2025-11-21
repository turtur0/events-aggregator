import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/app/lib/db';
import { scrapeAll, NormalisedEvent } from '@/app/lib/scrapers';
import { findDuplicates, selectPrimaryEvent } from '@/app/lib/utils/deduplication';
import Event from '@/app/lib/models/Event';

async function main() {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  🎭 Melbourne Events Aggregator - Full Scrape');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await connectDB();

    // Step 1: Scrape all sources
    const { events, results } = await scrapeAll({ verbose: true });

    if (events.length === 0) {
      console.log('\n⚠️  No events scraped from any source');
      return;
    }

    // Step 2: Cross-source deduplication
    console.log('\n🔍 Running cross-source deduplication...');
    const eventsWithIds = events.map((e, i) => ({ ...e, _id: `temp-${i}` }));
    const duplicates = findDuplicates(eventsWithIds);

    // Build set of IDs to skip (duplicates that should be merged)
    const skipIds = new Set<string>();
    duplicates.forEach(dup => {
      if (dup.shouldMerge) {
        const event1 = eventsWithIds.find(e => e._id === dup.event1Id)!;
        const event2 = eventsWithIds.find(e => e._id === dup.event2Id)!;
        const keep = selectPrimaryEvent(event1, event2);
        skipIds.add(keep === 'event1' ? dup.event2Id : dup.event1Id);
      }
    });

    const uniqueEvents = eventsWithIds.filter(e => !skipIds.has(e._id));
    console.log(`   Found ${duplicates.length} duplicate pairs`);
    console.log(`   Keeping ${uniqueEvents.length} unique events\n`);

    // Step 3: Save to database
    console.log('💾 Saving to database...');
    let inserted = 0, updated = 0, skipped = 0, errors = 0;

    for (const event of uniqueEvents) {
      try {
        const { _id, ...eventData } = event;

        const existing = await Event.findOne({
          source: eventData.source,
          sourceId: eventData.sourceId,
        });

        if (existing) {
          await Event.updateOne(
            { _id: existing._id },
            { $set: { ...eventData, lastUpdated: new Date() } }
          );
          updated++;
        } else {
          await Event.create(eventData);
          inserted++;
        }
      } catch (error: any) {
        if (error.code === 11000) {
          skipped++;
        } else {
          errors++;
          console.error(`   ❌ Error: ${event.title}:`, error.message);
        }
      }
    }

    // Step 4: Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalInDb = await Event.countDocuments();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📊 SCRAPE COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Duration:     ${duration}s`);
    console.log(`  Scraped:      ${events.length} events`);
    console.log(`  Deduplicated: ${uniqueEvents.length} unique`);
    console.log(`  Inserted:     ${inserted}`);
    console.log(`  Updated:      ${updated}`);
    console.log(`  Skipped:      ${skipped}`);
    console.log(`  Errors:       ${errors}`);
    console.log(`  Total in DB:  ${totalInDb}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

main();
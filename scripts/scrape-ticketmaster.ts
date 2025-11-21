// =============================================
// scripts/scrape-ticketmaster.ts
// =============================================
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/app/lib/db';
import { fetchAllTicketmasterEvents, normaliseTicketmasterEvent } from '@/app/lib/scrapers';
import Event from '@/app/lib/models/Event';

async function scrapeTicketmaster() {
  console.log('Ticketmaster Scraper\n');

  try {
    await connectDB();

    const rawEvents = await fetchAllTicketmasterEvents();
    console.log(`\n📦 Fetched ${rawEvents.length} events\n`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const raw of rawEvents) {
      try {
        const event = normaliseTicketmasterEvent(raw);

        const existing = await Event.findOne({
          source: 'ticketmaster',
          sourceId: event.sourceId,
        });

        if (existing) {
          await Event.updateOne({ _id: existing._id }, { $set: { ...event, lastUpdated: new Date() } });
          updated++;
        } else {
          await Event.create(event);
          inserted++;
        }
      } catch (error: any) {
        if (error.code === 11000) skipped++;
        else console.error(`❌ ${raw.name}:`, error.message);
      }
    }

    console.log(`\n✅ Done: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  } finally {
    await disconnectDB();
  }
}

scrapeTicketmaster();

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '@/app/lib/db';
import { fetchAllTicketmasterEvents } from '@/app/lib/scrapers/ticketmaster';
import { normaliseTicketmasterEvent } from '@/app/lib/utils/normalisation';
import Event from '@/app/lib/models/Event';

async function scrapeTicketmaster() {
    console.log('Starting Ticketmaster scrape...\n');

    try {
        // Connect to database
        await connectDB();
        console.log('Connected to MongoDB\n');

        // Fetch events from Ticketmaster
        const rawEvents = await fetchAllTicketmasterEvents();
        console.log(`Fetched ${rawEvents.length} events\n`);

        // Normalise and insert events
        let inserted = 0;
        let updated = 0;
        let errors = 0;

        for (const rawEvent of rawEvents) {
            try {
                const normalisedEvent = normaliseTicketmasterEvent(rawEvent);

                // Upsert: update if exists, insert if new
                const result = await Event.findOneAndUpdate(
                    { source: 'ticketmaster', sourceId: normalisedEvent.sourceId },
                    {
                        ...normalisedEvent,
                        lastUpdated: new Date(),
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                // Check if it was an insert or update
                if (result.scrapedAt.getTime() === result.lastUpdated.getTime()) {
                    inserted++;
                } else {
                    updated++;
                }

            } catch (error) {
                errors++;
                console.error(`Error processing event ${rawEvent.id}:`, error);
            }
        }

        console.log('\n Scrape Summary:');
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Total: ${rawEvents.length}`);

    } catch (error) {
        console.error('Fatal error during scrape:', error);
        process.exit(1);
    }

    process.exit(0);
}

scrapeTicketmaster();
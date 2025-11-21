// ============================================
// scripts/scrape-whatson.ts
// ============================================
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/app/lib/db';
import { scrapeWhatsOnMelbourne, WhatsOnScrapeOptions } from '@/app/lib/scrapers/whatson';
import Event from '@/app/lib/models/Event';

const SCRAPE_OPTIONS: WhatsOnScrapeOptions = {
    categories: ['theatre', 'music'], // Add more: 'festivals', 'family', etc.
    maxPages: 3,                      // Max pages to scrape per category
    maxEventsPerCategory: 50,         // Limit events per category
};

async function scrapeWhatsOn() {
    console.log('🎭 What\'s On Melbourne Scraper\n');
    console.log('📋 Options:', SCRAPE_OPTIONS, '\n');

    try {
        await connectDB();

        // Step 1: Scrape events
        const startTime = Date.now();
        const events = await scrapeWhatsOnMelbourne(SCRAPE_OPTIONS);
        const scrapeDuration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n✅ Scraped ${events.length} events in ${scrapeDuration}s\n`);

        if (events.length === 0) {
            console.log('⚠️  No events found. Exiting.\n');
            return;
        }

        // Step 2: Process events with deduplication
        let inserted = 0, updated = 0, skipped = 0;

        for (const event of events) {
            try {
                // Check if event already exists by source + sourceId
                const existing = await Event.findOne({
                    source: 'whatson',
                    sourceId: event.sourceId,
                });

                if (existing) {
                    // Update existing event
                    const updateData = {
                        ...event,
                        lastUpdated: new Date(),
                        // Preserve existing data if new data is missing
                        description: event.description || existing.description,
                        imageUrl: event.imageUrl || existing.imageUrl,
                        priceMin: event.priceMin ?? existing.priceMin,
                        priceMax: event.priceMax ?? existing.priceMax,
                        venue: {
                            name: event.venue.name || existing.venue.name,
                            address: event.venue.address || existing.venue.address,
                            suburb: event.venue.suburb || existing.venue.suburb,
                        },
                    };

                    await Event.updateOne(
                        { _id: existing._id },
                        { $set: updateData }
                    );
                    updated++;
                    console.log(`   ↻ Updated: ${event.title}`);
                } else {
                    // Insert new event
                    await Event.create(event);
                    inserted++;
                    console.log(`   + Inserted: ${event.title}`);
                }
            } catch (error: any) {
                // Handle duplicate key errors
                if (error.code === 11000) {
                    skipped++;
                    console.log(`   ⊘ Skipped (duplicate): ${event.title}`);
                } else {
                    console.error(`   ❌ Error processing "${event.title}":`, error.message);
                }
            }
        }

        // Step 3: Summary
        console.log(`\n${'='.repeat(70)}`);
        console.log('✅ Database Update Complete');
        console.log(`${'='.repeat(70)}`);
        console.log(`📊 Summary:`);
        console.log(`   • Inserted: ${inserted} new events`);
        console.log(`   • Updated:  ${updated} existing events`);
        console.log(`   • Skipped:  ${skipped} duplicates`);
        console.log(`   • Total:    ${events.length} events processed`);
        console.log(`   • Duration: ${scrapeDuration}s\n`);

    } catch (error) {
        console.error('\n❌ Scraping failed:', error);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

scrapeWhatsOn();
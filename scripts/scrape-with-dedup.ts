// ============================================
// scripts/scrape-with-dedup.ts
// Streamlined deduplication pipeline
// Time: O(n * k) where k = avg bucket size
// Space: O(n)
// ============================================

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB, disconnectDB } from '@/app/lib/db';
import Event from '@/app/lib/models/Event';
import { findDuplicates, selectPrimaryEvent, mergeEvents, type EventForDedup } from '@/app/lib/utils/deduplication';
import type { NormalisedEvent } from '@/app/lib/scrapers/types';

interface ProcessStats {
  inserted: number;
  updated: number;
  merged: number;
  skipped: number;
}

/**
 * Process events with cross-source deduplication
 */
export async function processEventsWithDeduplication(
  newEvents: NormalisedEvent[],
  sourceName: string
): Promise<ProcessStats> {
  console.log(`\n📊 Processing ${newEvents.length} events from ${sourceName}...`);

  const stats: ProcessStats = { inserted: 0, updated: 0, merged: 0, skipped: 0 };

  // Fetch all existing events once - O(n)
  console.log('   📥 Fetching existing events...');
  const existingEvents = await Event.find({}).lean();
  console.log(`   Found ${existingEvents.length} existing events`);

  // Build lookup maps - O(n)
  const existingBySourceId = new Map<string, typeof existingEvents[0]>();
  const existingForDedup: (EventForDedup & { _id: string })[] = [];

  for (const e of existingEvents) {
    existingBySourceId.set(`${e.source}:${e.sourceId}`, e);
    existingForDedup.push({
      _id: e._id.toString(),
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue,
      source: e.source,
      sourceId: e.sourceId,
      description: e.description,
      imageUrl: e.imageUrl,
      priceMin: e.priceMin,
      priceMax: e.priceMax,
    });
  }

  // Track events inserted this batch (for intra-batch dedup)
  const insertedThisBatch: (EventForDedup & { _id: string })[] = [];

  // Process each event - O(n * k)
  for (const newEvent of newEvents) {
    try {
      // Fast path: same source update
      const sameSourceKey = `${newEvent.source}:${newEvent.sourceId}`;
      const existing = existingBySourceId.get(sameSourceKey);

      if (existing) {
        await Event.updateOne(
          { _id: existing._id },
          { $set: { ...newEvent, lastUpdated: new Date() } }
        );
        stats.updated++;
        console.log(`   ↻ Updated: ${newEvent.title}`);
        continue;
      }

      // Cross-source dedup: check against existing + this batch
      const tempId = `temp:${newEvent.sourceId}`;
      const newForDedup: EventForDedup & { _id: string } = {
        _id: tempId,
        ...newEvent,
      };

      const pool = [...existingForDedup, ...insertedThisBatch, newForDedup];
      const dupes = findDuplicates(pool);

      // Find duplicates involving this event
      const match = dupes
        .filter(d => d.event1Id === tempId || d.event2Id === tempId)
        .sort((a, b) => b.confidence - a.confidence)[0];

      if (match) {
        const matchId = match.event1Id === tempId ? match.event2Id : match.event1Id;
        
        // Is it a DB event or batch event?
        const dbMatch = existingEvents.find(e => e._id.toString() === matchId);
        const batchMatch = insertedThisBatch.find(e => e._id === matchId);
        
        const matchEvent = dbMatch || batchMatch;
        if (matchEvent) {
          const isPrimary = selectPrimaryEvent(newForDedup, matchEvent as any) === 'event1';
          const merged = isPrimary
            ? mergeEvents(newEvent, matchEvent as any)
            : mergeEvents(matchEvent as any, newEvent);

          if (dbMatch) {
            await Event.updateOne({ _id: dbMatch._id }, { $set: merged });
          } else if (batchMatch) {
            await Event.updateOne(
              { source: batchMatch.source, sourceId: batchMatch.sourceId },
              { $set: merged }
            );
          }

          stats.merged++;
          console.log(`   🔗 Merged: "${newEvent.title}" ← ${matchEvent.source} (${(match.confidence * 100).toFixed(0)}%)`);
          continue;
        }
      }

      // No duplicate - insert new
      const created = await Event.create(newEvent);
      
      insertedThisBatch.push({
        _id: created._id.toString(),
        title: created.title,
        startDate: created.startDate,
        endDate: created.endDate,
        venue: created.venue,
        source: created.source,
        sourceId: created.sourceId,
        description: created.description,
        imageUrl: created.imageUrl,
        priceMin: created.priceMin,
        priceMax: created.priceMax,
      });

      stats.inserted++;
      console.log(`   + Inserted: ${newEvent.title}`);

    } catch (err: any) {
      if (err.code === 11000) {
        stats.skipped++;
        console.log(`   ⊘ Skipped (dup key): ${newEvent.title}`);
      } else {
        console.error(`   ❌ Error: ${newEvent.title} -`, err.message);
        stats.skipped++;
      }
    }
  }

  return stats;
}
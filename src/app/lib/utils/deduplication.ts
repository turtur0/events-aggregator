// ============================================
// deduplication.ts - Improved Multi-Strategy Deduplication
// Uses title-based bucketing + venue/date validation
// Time: O(n * k) where k = avg bucket size, Space: O(n)
// ============================================

import stringSimilarity from 'string-similarity';
import type { NormalisedEvent } from '../scrapers/types';

// ============================================
// CONFIGURATION
// ============================================

const THRESHOLDS = {
  TITLE_SIMILARITY: 0.75,    // Minimum title similarity
  OVERALL_MATCH: 0.80,       // Minimum combined score to merge
  DATE_WINDOW_DAYS: 7,       // Events within 7 days could be same run
};

// ============================================
// INTERFACES
// ============================================

interface EventForDedup {
  _id?: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  venue: { name: string; address: string; suburb: string };
  source: string;
  sourceId: string;
  description?: string;
  imageUrl?: string;
  priceMin?: number;
  priceMax?: number;
}

interface DuplicateMatch {
  event1Id: string;
  event2Id: string;
  confidence: number;
  reason: string;
}

// ============================================
// NORMALISATION - Keep it simple & consistent
// ============================================

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'at', 'to', 'for', 'of', 'in', 'on',
  'live', 'presents', 'featuring', 'feat', 'ft', 'show', 'tour',
]);

const VENUE_SUFFIXES = /\s*(theatre|theater|centre|center|arena|stadium|hall|auditorium|melbourne|hotel)$/gi;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normaliseTitle(title: string): string {
  const words = normalise(title).split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return words.join(' ');
}

function normaliseVenue(venue: string): string {
  return normalise(venue).replace(VENUE_SUFFIXES, '').trim();
}

/**
 * Extract primary tokens from title for bucketing
 * Takes first 2-3 significant words as bucket key
 */
function getTitleBucketKey(title: string): string {
  const words = normaliseTitle(title).split(' ').slice(0, 3);
  return words.join(' ');
}

// ============================================
// SIMILARITY SCORING
// ============================================

function titleSimilarity(t1: string, t2: string): number {
  const n1 = normaliseTitle(t1);
  const n2 = normaliseTitle(t2);
  
  // Exact normalised match
  if (n1 === n2) return 1.0;
  
  // One contains the other (handles "The Nutcracker" vs "The Nutcracker - Ballet")
  if (n1.includes(n2) || n2.includes(n1)) return 0.95;
  
  return stringSimilarity.compareTwoStrings(n1, n2);
}

function venueSimilarity(v1: string, v2: string): number {
  const n1 = normaliseVenue(v1);
  const n2 = normaliseVenue(v2);
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.95;
  
  return stringSimilarity.compareTwoStrings(n1, n2);
}

function dateOverlap(e1: EventForDedup, e2: EventForDedup): number {
  const start1 = e1.startDate.getTime();
  const end1 = (e1.endDate || e1.startDate).getTime();
  const start2 = e2.startDate.getTime();
  const end2 = (e2.endDate || e2.startDate).getTime();
  
  // Check if date ranges overlap
  if (start1 <= end2 && start2 <= end1) return 1.0;
  
  // Check if within window (for single-date events that might be same show run)
  const dayMs = 24 * 60 * 60 * 1000;
  const windowMs = THRESHOLDS.DATE_WINDOW_DAYS * dayMs;
  const gap = Math.min(Math.abs(start1 - start2), Math.abs(end1 - end2));
  
  if (gap <= windowMs) return 0.8;
  if (gap <= windowMs * 2) return 0.5;
  
  return 0;
}

/**
 * Calculate overall match score between two events
 */
function calculateMatchScore(e1: EventForDedup, e2: EventForDedup): { score: number; breakdown: string } {
  const title = titleSimilarity(e1.title, e2.title);
  const venue = venueSimilarity(e1.venue.name, e2.venue.name);
  const date = dateOverlap(e1, e2);
  
  // Title is most important, then venue, then date
  const score = title * 0.50 + venue * 0.30 + date * 0.20;
  
  const breakdown = `title:${(title*100).toFixed(0)}% venue:${(venue*100).toFixed(0)}% date:${(date*100).toFixed(0)}%`;
  
  return { score, breakdown };
}

// ============================================
// CORE DEDUPLICATION - Title-based bucketing
// ============================================

/**
 * Find duplicates using title-based bucketing
 * Much more robust than date+venue bucketing
 */
export function findDuplicates(events: (EventForDedup & { _id: string })[]): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  // Step 1: Bucket by normalised title prefix - O(n)
  const buckets = new Map<string, (EventForDedup & { _id: string })[]>();
  
  for (const event of events) {
    const key = getTitleBucketKey(event.title);
    if (!key) continue;
    
    const bucket = buckets.get(key) || [];
    bucket.push(event);
    buckets.set(key, bucket);
    
    // Also add to related buckets for fuzzy matching
    // e.g., "nutcracker ballet" also goes in "nutcracker" bucket
    const words = key.split(' ');
    if (words.length > 1) {
      const shortKey = words[0];
      const shortBucket = buckets.get(shortKey) || [];
      if (!shortBucket.includes(event)) {
        shortBucket.push(event);
        buckets.set(shortKey, shortBucket);
      }
    }
  }
  
  // Step 2: Compare within buckets - O(n * k²) but k is small
  const compared = new Set<string>();
  
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const e1 = bucket[i];
        const e2 = bucket[j];
        
        // Skip same source
        if (e1.source === e2.source) continue;
        
        // Skip if already compared
        const pairKey = [e1._id, e2._id].sort().join('|');
        if (compared.has(pairKey)) continue;
        compared.add(pairKey);
        
        // Calculate match score
        const { score, breakdown } = calculateMatchScore(e1, e2);
        
        if (score >= THRESHOLDS.OVERALL_MATCH) {
          duplicates.push({
            event1Id: e1._id,
            event2Id: e2._id,
            confidence: score,
            reason: `Match ${(score*100).toFixed(0)}% (${breakdown})`,
          });
        }
      }
    }
  }
  
  return duplicates;
}

// ============================================
// MERGE STRATEGY
// ============================================

const SOURCE_PRIORITY: Record<string, number> = {
  ticketmaster: 5,
  marriner: 4,
  whatson: 3,
};

export function selectPrimaryEvent(e1: EventForDedup, e2: EventForDedup): 'event1' | 'event2' {
  const p1 = SOURCE_PRIORITY[e1.source] || 0;
  const p2 = SOURCE_PRIORITY[e2.source] || 0;
  
  if (p1 !== p2) return p1 > p2 ? 'event1' : 'event2';
  
  // Compare completeness
  const score = (e: EventForDedup) => {
    let s = 0;
    if (e.description && e.description.length > 50) s += 2;
    if (e.imageUrl) s += 1;
    if (e.priceMin !== undefined) s += 1;
    if (e.venue.address && !e.venue.address.includes('TBA')) s += 1;
    return s;
  };
  
  return score(e1) >= score(e2) ? 'event1' : 'event2';
}

export function mergeEvents(primary: NormalisedEvent, secondary: NormalisedEvent): NormalisedEvent {
  const longer = (a?: string, b?: string) => {
    if (!a || a.includes('No description')) return b || a || '';
    if (!b || b.includes('No description')) return a;
    return a.length > b.length ? a : b;
  };
  
  return {
    ...primary,
    description: longer(primary.description, secondary.description),
    imageUrl: primary.imageUrl || secondary.imageUrl,
    priceMin: primary.priceMin ?? secondary.priceMin,
    priceMax: primary.priceMax ?? secondary.priceMax,
    isFree: primary.isFree || secondary.isFree,
    endDate: primary.endDate || secondary.endDate,
    venue: {
      name: primary.venue.name.length > secondary.venue.name.length ? primary.venue.name : secondary.venue.name,
      address: primary.venue.address.includes('TBA') ? secondary.venue.address : primary.venue.address,
      suburb: primary.venue.suburb || secondary.venue.suburb,
    },
    lastUpdated: new Date(),
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  normaliseTitle,
  normaliseVenue,
  calculateMatchScore,
  THRESHOLDS,
  type EventForDedup,
  type DuplicateMatch,
};
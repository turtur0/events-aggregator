// lib/utils/normalization.ts
import { TicketmasterEvent, NormalisedEvent } from '../types';

export function normaliseTicketmasterEvent(
  event: TicketmasterEvent
): NormalisedEvent {
  // Extract category from classifications
  const category = event.classifications?.[0]?.segment?.name || 'Other';
  
  // Parse dates
  const startDate = parseTicketmasterDate(
    event.dates.start.localDate,
    event.dates.start.localTime
  );
  
  // Only parse endDate if it exists AND has valid data
  let endDate: Date | undefined;
  if (event.dates.end?.localDate) {
    try {
      endDate = parseTicketmasterDate(
        event.dates.end.localDate, 
        event.dates.end.localTime
      );
    } catch (error) {
      // If end date is invalid, just leave it undefined
      console.warn(`Invalid end date for event ${event.id}, skipping`);
      endDate = undefined;
    }
  }
  
  // Extract venue info
  const venue = event._embedded?.venues?.[0];
  const venueInfo = {
    name: venue?.name || 'Venue TBA',
    address: venue?.address?.line1 || 'TBA',
    suburb: venue?.city?.name || 'Melbourne',
  };
  
  // Extract price info
  const priceRange = event.priceRanges?.[0];
  const priceMin = priceRange?.min;
  const priceMax = priceRange?.max;
  const isFree = priceMin === 0 || (!priceMin && !priceMax);
  
  // Get best quality image (largest width)
  const imageUrl = event.images
    ?.sort((a, b) => b.width - a.width)[0]?.url;
  
  // Create the normalised event object
  const normalised: NormalisedEvent = {
    title: event.name,
    description: event.description || 'No description available',
    category: normaliseCategory(category),
    
    startDate,
    endDate, // Will be undefined if invalid
    
    venue: venueInfo,
    
    priceMin,
    priceMax,
    isFree,
    
    bookingUrl: event.url,
    imageUrl,
    
    source: 'ticketmaster',
    sourceId: event.id,
    scrapedAt: new Date(),
  };
  
  // Remove endDate if it's undefined (don't send undefined to MongoDB)
  if (normalised.endDate === undefined) {
    delete normalised.endDate;
  }
  
  return normalised;
}

function parseTicketmasterDate(date: string, time?: string): Date {
  // date format: "2025-11-20"
  // time format: "19:30:00" (optional)
  
  if (time) {
    const parsed = new Date(`${date}T${time}`);
    // Check if date is valid
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${date}T${time}`);
    }
    return parsed;
  }
  
  // If no time, set to midday to avoid timezone issues
  const parsed = new Date(`${date}T12:00:00`);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return parsed;
}

function normaliseCategory(category: string): string {
  // Standardise category names
  const categoryMap: Record<string, string> = {
    'Music': 'Music',
    'Sports': 'Sports',
    'Arts & Theatre': 'Theatre',
    'Film': 'Film',
    'Miscellaneous': 'Other',
  };
  
  return categoryMap[category] || category;
}
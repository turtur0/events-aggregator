/**
 * Unified event format used throughout the application
 * This is what gets stored in MongoDB after normalization
 */
export interface NormalisedEvent {
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  
  startDate: Date;
  endDate?: Date;
  
  venue: {
    name: string;
    address?: string;
    suburb?: string;
  };
  
  priceMin?: number;
  priceMax?: number;
  isFree: boolean;
  
  bookingUrl: string;
  imageUrl?: string;
  
  source: 'ticketmaster' | 'eventbrite' | 'artscentre';
  sourceId: string;
  scrapedAt: Date;
}

/**
 * Event sources enum for type safety
 */
export type EventSource = 'ticketmaster' | 'eventbrite' | 'artscentre';

/**
 * Base event interface with ID (for operations that need _id)
 */
export interface EventWithId extends NormalisedEvent {
  _id: string;
}
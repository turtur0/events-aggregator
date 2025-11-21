// ============================================
// types.ts - Updated Ticketmaster Types
// ============================================

export interface NormalisedEvent {
  title: string;
  description: string;
  category: string;
  subcategory?: string;

  startDate: Date;
  endDate?: Date;

  venue: {
    name: string;
    address: string;
    suburb: string;
  };

  priceMin?: number;
  priceMax?: number;
  isFree: boolean;

  bookingUrl: string;
  imageUrl?: string;

  source: 'ticketmaster' | 'marriner' | 'whatson';
  sourceId: string;
  scrapedAt: Date;
  lastUpdated: Date;
}

// ============================================
// Ticketmaster API Response Types
// ============================================

export interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  info?: string; // Additional info field that Ticketmaster sometimes includes
  url?: string;
  dates: {
    start: { 
      localDate: string; 
      localTime?: string;
      dateTime?: string; // ISO datetime
    };
    end?: { 
      localDate: string; 
      localTime?: string;
      dateTime?: string;
    };
    timezone?: string;
    status?: {
      code?: string;
    };
  };
  classifications?: Array<{
    primary?: boolean;
    segment?: { 
      id?: string;
      name: string;
    };
    genre?: { 
      id?: string;
      name: string;
    };
    subGenre?: { 
      id?: string;
      name: string;
    };
    type?: {
      id?: string;
      name?: string;
    };
    subType?: {
      id?: string;
      name?: string;
    };
  }>;
  priceRanges?: Array<{ 
    type?: string;
    currency?: string; // e.g., "AUD", "USD"
    min?: number; 
    max?: number;
  }>;
  images?: Array<{ 
    url: string; 
    width: number;
    height?: number; // Some images include height
    ratio?: string; // e.g., "16_9", "3_2"
    fallback?: boolean;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      type?: string;
      id?: string;
      address?: { 
        line1?: string;
        line2?: string;
      };
      city?: { 
        name: string;
      };
      state?: {
        name: string;
        stateCode?: string;
      };
      country?: {
        name?: string;
        countryCode?: string;
      };
      postalCode?: string;
      location?: {
        longitude?: string;
        latitude?: string;
      };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      type?: string;
      url?: string;
      images?: Array<{
        url: string;
        width: number;
        height?: number;
      }>;
    }>;
  };
  sales?: {
    public?: {
      startDateTime?: string;
      endDateTime?: string;
    };
  };
  seatmap?: {
    staticUrl?: string;
  };
  accessibility?: {
    info?: string;
  };
  ageRestrictions?: {
    legalAgeEnforced?: boolean;
  };
  ticketLimit?: {
    info?: string;
  };
  pleaseNote?: string;
  locale?: string;
  promoter?: {
    id?: string;
    name?: string;
  };
}

// ============================================
// Scraper Options
// ============================================

export interface ScrapeOptions {
  maxCategories?: number;
  maxEventsPerCategory?: number;
  specificCategories?: string[];
}

// ============================================
// Scrape Result
// ============================================

export interface ScrapeResult {
  events: NormalisedEvent[];
  stats: {
    source: string;
    fetched: number;
    normalised: number;
    errors: number;
    duration: number;
  };
}
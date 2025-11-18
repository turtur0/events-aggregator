/**
 * Ticketmaster API response types
 * Based on Ticketmaster Discovery API v2
 * @see https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

export interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  info?: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
    end?: {
      localDate: string;
      localTime?: string;
    };
  };
  classifications?: Array<{
    segment: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      address?: {
        line1?: string;
      };
      city?: {
        name: string;
      };
      state?: {
        name: string;
      };
    }>;
  };
}

export interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}
// Eventbrite API response types
export interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text?: string;
  };
  url: string;
  start: {
    local: string;
    timezone: string;
  };
  end: {
    local: string;
  };
  is_free: boolean;
  category?: {
    name: string;
    subcategory?: {
      name: string;
    };
  };
  logo?: {
    url: string;
  };
  venue?: {
    name: string;
    address: {
      address_1?: string;
      city?: string;
      region?: string;
      postal_code?: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: {
      major_value: number;
      currency: string;
    };
    maximum_ticket_price?: {
      major_value: number;
      currency: string;
    };
  };
}

export interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    page_size: number;
    object_count: number;
  };
}
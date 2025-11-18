import { TicketmasterEvent, NormalisedEvent } from '../types';

export function normaliseTicketmasterEvent(
  event: TicketmasterEvent
): NormalisedEvent {
  const classification = event.classifications?.[0];
  
  // Get raw classification data
  const segment = classification?.segment?.name || 'Other';
  const genre = classification?.genre?.name;
  const subGenre = classification?.subGenre?.name;

  // Log for debugging
  console.log(`\nNormalizing: ${event.name}`);
  console.log(`  Segment: ${segment}, Genre: ${genre}, SubGenre: ${subGenre}`);

  const { category, subcategory } = normaliseCategoryAndSubcategory(
    segment,
    genre,
    subGenre,
    event.name
  );

  console.log(`  → Mapped to: ${category}${subcategory ? ` / ${subcategory}` : ''}`);

  const startDate = parseTicketmasterDate(
    event.dates.start.localDate,
    event.dates.start.localTime
  );

  let endDate: Date | undefined;
  if (event.dates.end?.localDate && event.dates.end.localDate !== event.dates.start.localDate) {
    try {
      endDate = parseTicketmasterDate(
        event.dates.end.localDate, 
        event.dates.end.localTime
      );
    } catch {
      // Silently skip invalid end date
    }
  }

  const venue = event._embedded?.venues?.[0];
  const venueInfo = {
    name: venue?.name || 'Venue TBA',
    address: venue?.address?.line1 || 'TBA',
    suburb: venue?.city?.name || 'Melbourne',
  };

  const { priceMin, priceMax, isFree } = extractPriceInfo(event);

  const imageUrl = event.images
    ?.sort((a, b) => b.width - a.width)[0]?.url;

  const bookingUrl = event.url || `https://www.ticketmaster.com.au/event/${event.id}`;

  return {
    title: event.name,
    description: event.description || 'No description available',
    category,
    subcategory, // Make sure this is included!

    startDate,
    endDate,

    venue: venueInfo,

    priceMin,
    priceMax,
    isFree,

    bookingUrl,
    imageUrl,

    source: 'ticketmaster',
    sourceId: event.id,
    scrapedAt: new Date(),
  };
}

/**
 * Simplified category mapping - uses genre as primary signal
 */
function normaliseCategoryAndSubcategory(
  segment: string,
  genre?: string,
  subGenre?: string,
  eventTitle?: string
): { category: string; subcategory?: string } {
  const segmentLower = segment.toLowerCase();
  const genreLower = genre?.toLowerCase() || '';
  const subGenreLower = subGenre?.toLowerCase() || '';
  const titleLower = eventTitle?.toLowerCase() || '';

  // MUSIC
  if (segmentLower === 'music') {
    // Try subGenre first, then genre
    const subcategory = mapMusicSubcategory(subGenreLower, genreLower);
    return { category: 'music', subcategory };
  }

  // THEATRE / ARTS
  if (segmentLower === 'arts & theatre' || segmentLower.includes('theatre') || segmentLower === 'arts') {
    const subcategory = mapTheatreSubcategory(genreLower, subGenreLower, titleLower);
    return { category: 'theatre', subcategory };
  }

  // SPORTS
  if (segmentLower === 'sports') {
    const subcategory = mapSportsSubcategory(genreLower, subGenreLower);
    return { category: 'sports', subcategory };
  }

  // FAMILY
  if (segmentLower.includes('family') || genreLower.includes('family')) {
    const subcategory = mapFamilySubcategory(genreLower, titleLower);
    return { category: 'family', subcategory };
  }

  // FILM
  if (segmentLower === 'film') {
    return { category: 'arts', subcategory: 'Film & Cinema' };
  }

  // DEFAULT
  return { category: 'other' };
}

function mapMusicSubcategory(subGenre: string, genre: string): string | undefined {
  const text = `${subGenre} ${genre}`.toLowerCase();

  if (text.includes('rock') || text.includes('alternative') || text.includes('indie')) {
    return 'Rock & Alternative';
  }
  if (text.includes('pop') || text.includes('electronic') || text.includes('dance') || text.includes('edm')) {
    return 'Pop & Electronic';
  }
  if (text.includes('hip hop') || text.includes('hip-hop') || text.includes('rap') || text.includes('r&b') || text.includes('rnb')) {
    return 'Hip Hop & R&B';
  }
  if (text.includes('jazz') || text.includes('blues')) {
    return 'Jazz & Blues';
  }
  if (text.includes('classical') || text.includes('orchestra') || text.includes('symphony')) {
    return 'Classical & Orchestra';
  }
  if (text.includes('country') || text.includes('folk') || text.includes('bluegrass')) {
    return 'Country & Folk';
  }
  if (text.includes('metal') || text.includes('punk') || text.includes('hardcore')) {
    return 'Metal & Punk';
  }
  if (text.includes('world') || text.includes('latin') || text.includes('reggae') || text.includes('african')) {
    return 'World Music';
  }

  return undefined;
}

function mapTheatreSubcategory(genre: string, subGenre: string, title: string): string | undefined {
  const text = `${genre} ${subGenre} ${title}`.toLowerCase();

  if (text.includes('musical')) {
    return 'Musicals';
  }
  if (text.includes('ballet') || text.includes('dance')) {
    return 'Ballet & Dance';
  }
  if (text.includes('opera')) {
    return 'Opera';
  }
  if (text.includes('comedy') && !text.includes('festival')) {
    return 'Comedy Shows';
  }
  if (text.includes('shakespeare')) {
    return 'Shakespeare';
  }
  if (text.includes('cabaret')) {
    return 'Cabaret';
  }
  if (text.includes('drama') || text.includes('play')) {
    return 'Drama';
  }
  if (text.includes('circus')) {
    return 'Circus & Magic';
  }

  return undefined;
}

function mapSportsSubcategory(genre: string, subGenre: string): string | undefined {
  const text = `${genre} ${subGenre}`.toLowerCase();

  if (text.includes('afl') || (text.includes('football') && text.includes('australian'))) {
    return 'AFL';
  }
  if (text.includes('cricket')) {
    return 'Cricket';
  }
  if (text.includes('soccer') || text.includes('football') && !text.includes('afl')) {
    return 'Soccer';
  }
  if (text.includes('basketball')) {
    return 'Basketball';
  }
  if (text.includes('tennis')) {
    return 'Tennis';
  }
  if (text.includes('rugby')) {
    return 'Rugby';
  }
  if (text.includes('motor') || text.includes('racing') || text.includes('f1')) {
    return 'Motorsports';
  }

  return 'Other Sports';
}

function mapFamilySubcategory(genre: string, title: string): string | undefined {
  const text = `${genre} ${title}`.toLowerCase();

  if (text.includes('circus') || text.includes('magic')) {
    return 'Circus & Magic';
  }
  if (text.includes('kids') || text.includes('children')) {
    return 'Kids Shows';
  }
  if (text.includes('education')) {
    return 'Educational';
  }

  return 'Family Entertainment';
}

function extractPriceInfo(event: TicketmasterEvent): {
  priceMin?: number;
  priceMax?: number;
  isFree: boolean;
} {
  if (!event.priceRanges || event.priceRanges.length === 0) {
    return {
      priceMin: undefined,
      priceMax: undefined,
      isFree: false,
    };
  }

  const prices = event.priceRanges;

  const allMins = prices
    .map(p => p.min)
    .filter(p => p !== undefined && p !== null && !isNaN(p));

  const allMaxs = prices
    .map(p => p.max)
    .filter(p => p !== undefined && p !== null && !isNaN(p));

  const priceMin = allMins.length > 0 ? Math.min(...allMins) : undefined;
  const priceMax = allMaxs.length > 0 ? Math.max(...allMaxs) : undefined;

  const isFree = priceMin === 0 || (priceMin === undefined && priceMax === 0);

  return {
    priceMin: priceMin && priceMin > 0 ? Math.round(priceMin) : undefined,
    priceMax: priceMax && priceMax > 0 ? Math.round(priceMax) : undefined,
    isFree,
  };
}

function parseTicketmasterDate(date: string, time?: string): Date {
  const parsed = time
    ? new Date(`${date}T${time}`)
    : new Date(`${date}T12:00:00`);

  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${date}${time ? `T${time}` : ''}`);
  }

  return parsed;
}
import { CATEGORIES, getSubcategories } from '../categories';

export interface CategoryMapResult {
  category: string;
  subcategory?: string;
}

/**
 * Map Ticketmaster classification to our categories
 */
export function mapTicketmasterCategory(
  segment: string | undefined,
  genre: string | undefined,
  subGenre: string | undefined,
  title: string
): CategoryMapResult {
  const seg = (segment || '').toLowerCase();
  const gen = (genre || '').toLowerCase();
  const subGen = (subGenre || '').toLowerCase();
  const combined = `${gen} ${subGen} ${title}`.toLowerCase();

  // Music
  if (seg === 'music') {
    return {
      category: 'music',
      subcategory: findBestMatch('music', combined),
    };
  }

  // Sports
  if (seg === 'sports') {
    return {
      category: 'sports',
      subcategory: findBestMatch('sports', combined),
    };
  }

  // Theatre
  if (seg.includes('theatre') || seg === 'arts') {
    return {
      category: 'theatre',
      subcategory: findBestMatch('theatre', combined),
    };
  }

  // Family
  if (seg.includes('family') || combined.includes('family')) {
    return {
      category: 'family',
      subcategory: findBestMatch('family', combined),
    };
  }

  // Film
  if (seg === 'film') {
    return {
      category: 'arts',
      subcategory: 'Film & Cinema',
    };
  }

  // Default
  return { category: 'other' };
}

/**
 * Find best matching subcategory from text
 */
function findBestMatch(
  categoryValue: string,
  text: string
): string | undefined {
  const subcategories = getSubcategories(categoryValue);

  // Try exact matches first
  for (const sub of subcategories) {
    if (text.includes(sub.toLowerCase())) {
      return sub;
    }
  }

  // Try keyword-based matches
  const matches = {
    music: [
      { keywords: ['rock', 'alternative', 'indie'], sub: 'Rock & Alternative' },
      { keywords: ['pop', 'electronic', 'dance', 'edm'], sub: 'Pop & Electronic' },
      { keywords: ['hip hop', 'rap', 'r&b'], sub: 'Hip Hop & R&B' },
      { keywords: ['jazz', 'blues'], sub: 'Jazz & Blues' },
      { keywords: ['classical', 'orchestra', 'symphony'], sub: 'Classical & Orchestra' },
      { keywords: ['country', 'folk'], sub: 'Country & Folk' },
      { keywords: ['metal', 'punk'], sub: 'Metal & Punk' },
    ],
    sports: [
      { keywords: ['afl'], sub: 'AFL' },
      { keywords: ['cricket'], sub: 'Cricket' },
      { keywords: ['soccer', 'football'], sub: 'Soccer' },
      { keywords: ['basketball'], sub: 'Basketball' },
      { keywords: ['tennis'], sub: 'Tennis' },
      { keywords: ['rugby'], sub: 'Rugby' },
      { keywords: ['motorsport', 'racing', 'f1'], sub: 'Motorsports' },
    ],
    theatre: [
      { keywords: ['musical'], sub: 'Musicals' },
      { keywords: ['drama'], sub: 'Drama' },
      { keywords: ['comedy'], sub: 'Comedy Shows' },
      { keywords: ['ballet', 'dance'], sub: 'Ballet & Dance' },
      { keywords: ['opera'], sub: 'Opera' },
      { keywords: ['cabaret'], sub: 'Cabaret' },
      { keywords: ['shakespeare'], sub: 'Shakespeare' },
      { keywords: ['experimental'], sub: 'Experimental' },
    ],
    family: [
      { keywords: ['kids', 'children'], sub: 'Kids Shows' },
      { keywords: ['family'], sub: 'Family Entertainment' },
      { keywords: ['educational'], sub: 'Educational' },
      { keywords: ['circus', 'magic'], sub: 'Circus & Magic' },
    ],
  };

  const categoryMatches = matches[categoryValue as keyof typeof matches];
  if (!categoryMatches) return undefined;

  for (const { keywords, sub } of categoryMatches) {
    if (keywords.some(kw => text.includes(kw))) {
      return sub;
    }
  }

  return undefined;
}
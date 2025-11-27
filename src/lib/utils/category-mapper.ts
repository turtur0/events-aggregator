/**
 * Maps event data from various sources to normalised category and subcategory values.
 * 
 * This module provides source-specific mapping functions that analyse event metadata
 * (titles, genres, tags) to assign consistent category classifications across all sources.
 */

/**
 * Maps What's On Melbourne category tags to normalised categories.
 * 
 * @param categoryTag - Original category tag from What's On Melbourne (e.g., 'theatre', 'music')
 * @param title - Event title for additional context in classification
 * @returns Normalised category and subcategory
 */
export function mapWhatsOnCategory(
  categoryTag: string,
  title: string
): { category: string; subcategory?: string } {
  const titleLower = title.toLowerCase();

  switch (categoryTag) {
    case 'theatre':
      return classifyTheatre(titleLower);

    case 'music':
      return classifyMusic(titleLower);

    case 'festivals':
      return titleLower.includes('comedy')
        ? { category: 'arts', subcategory: 'Comedy Festival' }
        : { category: 'arts', subcategory: 'Cultural Festivals' };

    case 'family':
      return classifyFamily(titleLower);

    case 'arts':
    case 'art':
      return classifyArts(titleLower);

    default:
      return { category: 'other', subcategory: 'Community Events' };
  }
}

/**
 * Maps Ticketmaster segment/genre data to normalised categories.
 * 
 * @param segment - Top-level Ticketmaster segment (e.g., 'Music', 'Sports')
 * @param genre - Genre classification
 * @param subGenre - Sub-genre classification (optional)
 * @param title - Event title for additional context
 * @returns Normalised category and subcategory
 */
export function mapTicketmasterCategory(
  segment?: string,
  genre?: string,
  subGenre?: string,
  title?: string
): { category: string; subcategory?: string } {
  const titleLower = title?.toLowerCase() || '';

  switch (segment) {
    case 'Music':
      return classifyMusicByGenre(genre);

    case 'Sports':
      return classifySports(genre);

    case 'Arts & Theatre':
      return classifyTheatre(titleLower);

    case 'Film':
      return { category: 'arts', subcategory: 'Film & Cinema' };

    case 'Miscellaneous':
      if (genre === 'Family') {
        return { category: 'family', subcategory: 'Family Entertainment' };
      }
      if (titleLower.includes('comedy festival')) {
        return { category: 'arts', subcategory: 'Comedy Festival' };
      }
      return { category: 'other', subcategory: 'Community Events' };

    default:
      return { category: 'other', subcategory: 'Community Events' };
  }
}

/**
 * Maps Marriner Group events to normalised categories.
 * 
 * Marriner operates major Melbourne theatres, so most events default to theatre.
 * 
 * @param title - Event title
 * @param venue - Venue name for additional context
 * @returns Normalised category and subcategory
 */
export function mapMarrinerCategory(
  title: string,
  venue: string
): { category: string; subcategory?: string } {
  const titleLower = title.toLowerCase();

  // Check for music events
  if (titleLower.includes('concert') ||
    titleLower.includes('symphony') ||
    titleLower.includes('orchestra')) {
    return { category: 'music', subcategory: 'Classical & Orchestra' };
  }

  if (titleLower.includes('jazz') || titleLower.includes('blues')) {
    return { category: 'music', subcategory: 'Jazz & Blues' };
  }

  if (titleLower.includes('rock') || titleLower.includes('alternative')) {
    return { category: 'music', subcategory: 'Rock & Alternative' };
  }

  if (titleLower.includes('pop')) {
    return { category: 'music', subcategory: 'Pop & Electronic' };
  }

  // Most Marriner events are theatre
  return classifyTheatre(titleLower, venue);
}

/**
 * Classifies theatre events based on title keywords.
 */
function classifyTheatre(titleLower: string, venue?: string): { category: string; subcategory?: string } {
  if (titleLower.includes('musical')) {
    return { category: 'theatre', subcategory: 'Musicals' };
  }

  if (titleLower.includes('opera')) {
    return { category: 'theatre', subcategory: 'Opera' };
  }

  if (titleLower.includes('ballet') ||
    titleLower.includes('nutcracker') ||
    titleLower.includes('dance')) {
    return { category: 'theatre', subcategory: 'Ballet & Dance' };
  }

  if (titleLower.includes('comedy') || venue?.includes('Comedy')) {
    return { category: 'theatre', subcategory: 'Comedy Shows' };
  }

  if (titleLower.includes('cabaret')) {
    return { category: 'theatre', subcategory: 'Cabaret' };
  }

  if (titleLower.includes('shakespeare')) {
    return { category: 'theatre', subcategory: 'Shakespeare' };
  }

  if (titleLower.includes('experimental')) {
    return { category: 'theatre', subcategory: 'Experimental' };
  }

  return { category: 'theatre', subcategory: 'Drama' };
}

/**
 * Classifies music events based on title keywords.
 */
function classifyMusic(titleLower: string): { category: string; subcategory?: string } {
  if (titleLower.includes('classical') ||
    titleLower.includes('orchestra') ||
    titleLower.includes('symphony')) {
    return { category: 'music', subcategory: 'Classical & Orchestra' };
  }

  if (titleLower.includes('jazz') || titleLower.includes('blues')) {
    return { category: 'music', subcategory: 'Jazz & Blues' };
  }

  if (titleLower.includes('rock') ||
    titleLower.includes('alternative') ||
    titleLower.includes('indie')) {
    return { category: 'music', subcategory: 'Rock & Alternative' };
  }

  if (titleLower.includes('pop') ||
    titleLower.includes('electronic') ||
    titleLower.includes('edm')) {
    return { category: 'music', subcategory: 'Pop & Electronic' };
  }

  if (titleLower.includes('hip hop') ||
    titleLower.includes('rap') ||
    titleLower.includes('r&b') ||
    titleLower.includes('rnb')) {
    return { category: 'music', subcategory: 'Hip Hop & R&B' };
  }

  if (titleLower.includes('country') || titleLower.includes('folk')) {
    return { category: 'music', subcategory: 'Country & Folk' };
  }

  if (titleLower.includes('metal') || titleLower.includes('punk')) {
    return { category: 'music', subcategory: 'Metal & Punk' };
  }

  if (titleLower.includes('world music') || titleLower.includes('ethnic')) {
    return { category: 'music', subcategory: 'World Music' };
  }

  // Default for unclassified music
  return { category: 'music', subcategory: 'Pop & Electronic' };
}

/**
 * Classifies music events by Ticketmaster genre.
 */
function classifyMusicByGenre(genre?: string): { category: string; subcategory?: string } {
  switch (genre) {
    case 'Rock':
    case 'Alternative':
      return { category: 'music', subcategory: 'Rock & Alternative' };

    case 'Pop':
    case 'Electronic':
      return { category: 'music', subcategory: 'Pop & Electronic' };

    case 'Jazz':
    case 'Blues':
      return { category: 'music', subcategory: 'Jazz & Blues' };

    case 'Classical':
    case 'Orchestra':
    case 'Symphony':
      return { category: 'music', subcategory: 'Classical & Orchestra' };

    case 'Hip-Hop/Rap':
    case 'R&B':
    case 'Hip Hop':
      return { category: 'music', subcategory: 'Hip Hop & R&B' };

    case 'Country':
    case 'Folk':
      return { category: 'music', subcategory: 'Country & Folk' };

    case 'Metal':
    case 'Punk':
      return { category: 'music', subcategory: 'Metal & Punk' };

    case 'World':
      return { category: 'music', subcategory: 'World Music' };

    default:
      return { category: 'music', subcategory: 'Pop & Electronic' };
  }
}

/**
 * Classifies sports events by Ticketmaster genre.
 */
function classifySports(genre?: string): { category: string; subcategory?: string } {
  switch (genre) {
    case 'Football':
    case 'AFL':
      return { category: 'sports', subcategory: 'AFL' };

    case 'Cricket':
      return { category: 'sports', subcategory: 'Cricket' };

    case 'Soccer':
      return { category: 'sports', subcategory: 'Soccer' };

    case 'Basketball':
      return { category: 'sports', subcategory: 'Basketball' };

    case 'Tennis':
      return { category: 'sports', subcategory: 'Tennis' };

    case 'Rugby':
      return { category: 'sports', subcategory: 'Rugby' };

    case 'Motor Sports':
    case 'Racing':
      return { category: 'sports', subcategory: 'Motorsports' };

    default:
      return { category: 'sports', subcategory: 'Other Sports' };
  }
}

/**
 * Classifies family events based on title keywords.
 */
function classifyFamily(titleLower: string): { category: string; subcategory?: string } {
  if (titleLower.includes('kids') || titleLower.includes('children')) {
    return { category: 'family', subcategory: 'Kids Shows' };
  }

  if (titleLower.includes('circus') || titleLower.includes('magic')) {
    return { category: 'family', subcategory: 'Circus & Magic' };
  }

  if (titleLower.includes('education')) {
    return { category: 'family', subcategory: 'Educational' };
  }

  return { category: 'family', subcategory: 'Family Entertainment' };
}

/**
 * Classifies arts and culture events based on title keywords.
 */
function classifyArts(titleLower: string): { category: string; subcategory?: string } {
  if (titleLower.includes('film') ||
    titleLower.includes('cinema') ||
    titleLower.includes('movie')) {
    return { category: 'arts', subcategory: 'Film & Cinema' };
  }

  if (titleLower.includes('exhibition') || titleLower.includes('gallery')) {
    return { category: 'arts', subcategory: 'Art Exhibitions' };
  }

  if (titleLower.includes('book') ||
    titleLower.includes('author') ||
    titleLower.includes('poetry')) {
    return { category: 'arts', subcategory: 'Literary Events' };
  }

  if (titleLower.includes('market') || titleLower.includes('fair')) {
    return { category: 'arts', subcategory: 'Markets & Fairs' };
  }

  return { category: 'arts', subcategory: 'Cultural Festivals' };
}
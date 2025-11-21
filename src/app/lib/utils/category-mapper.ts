// ============================================
// category-mapper.ts
// Centralized category mapping for all sources
// ============================================

/**
 * Map What's On Melbourne categories to normalized categories
 */
export function mapWhatsOnCategory(
  categoryTag: string,
  title: string
): { category: string; subcategory?: string } {
  const titleLower = title.toLowerCase();

  // Theatre category
  if (categoryTag === 'theatre') {
    if (titleLower.includes('musical')) {
      return { category: 'performing-arts', subcategory: 'Musical' };
    }
    if (titleLower.includes('comedy')) {
      return { category: 'performing-arts', subcategory: 'Comedy' };
    }
    if (titleLower.includes('opera')) {
      return { category: 'performing-arts', subcategory: 'Opera' };
    }
    if (titleLower.includes('ballet') || titleLower.includes('dance')) {
      return { category: 'performing-arts', subcategory: 'Dance' };
    }
    return { category: 'performing-arts', subcategory: 'Theatre' };
  }

  // Music category
  if (categoryTag === 'music') {
    if (titleLower.includes('classical') || titleLower.includes('orchestra') || titleLower.includes('symphony')) {
      return { category: 'music', subcategory: 'Classical' };
    }
    if (titleLower.includes('jazz')) {
      return { category: 'music', subcategory: 'Jazz' };
    }
    if (titleLower.includes('rock')) {
      return { category: 'music', subcategory: 'Rock' };
    }
    if (titleLower.includes('pop')) {
      return { category: 'music', subcategory: 'Pop' };
    }
    if (titleLower.includes('folk')) {
      return { category: 'music', subcategory: 'Folk' };
    }
    if (titleLower.includes('concert')) {
      return { category: 'music', subcategory: 'Concert' };
    }
    return { category: 'music', subcategory: 'Live Music' };
  }

  // Festivals category
  if (categoryTag === 'festivals') {
    return { category: 'festivals', subcategory: 'Festival' };
  }

  // Family category
  if (categoryTag === 'family') {
    return { category: 'family', subcategory: 'Family Event' };
  }

  // Default
  return { category: 'other', subcategory: undefined };
}

/**
 * Map Ticketmaster categories to normalized categories
 */
export function mapTicketmasterCategory(
  segment?: string,
  genre?: string,
  subGenre?: string,
  title?: string
): { category: string; subcategory?: string } {
  const titleLower = title?.toLowerCase() || '';

  if (segment === 'Music') {
    if (genre === 'Rock') return { category: 'music', subcategory: 'Rock' };
    if (genre === 'Pop') return { category: 'music', subcategory: 'Pop' };
    if (genre === 'Jazz') return { category: 'music', subcategory: 'Jazz' };
    if (genre === 'Classical') return { category: 'music', subcategory: 'Classical' };
    if (genre === 'Hip-Hop/Rap') return { category: 'music', subcategory: 'Hip Hop' };
    if (genre === 'Electronic') return { category: 'music', subcategory: 'Electronic' };
    if (genre === 'Country') return { category: 'music', subcategory: 'Country' };
    if (genre === 'Metal') return { category: 'music', subcategory: 'Metal' };
    return { category: 'music', subcategory: genre || 'Concert' };
  }

  if (segment === 'Sports') {
    return { category: 'sports', subcategory: genre };
  }

  if (segment === 'Arts & Theatre') {
    if (titleLower.includes('musical')) {
      return { category: 'performing-arts', subcategory: 'Musical' };
    }
    if (titleLower.includes('opera')) {
      return { category: 'performing-arts', subcategory: 'Opera' };
    }
    if (titleLower.includes('ballet') || titleLower.includes('dance')) {
      return { category: 'performing-arts', subcategory: 'Dance' };
    }
    if (titleLower.includes('comedy')) {
      return { category: 'performing-arts', subcategory: 'Comedy' };
    }
    return { category: 'performing-arts', subcategory: genre || 'Theatre' };
  }

  if (segment === 'Film') {
    return { category: 'film', subcategory: genre };
  }

  if (segment === 'Miscellaneous') {
    if (genre === 'Family') return { category: 'family', subcategory: 'Family Event' };
    return { category: 'other', subcategory: genre };
  }

  return { category: 'other', subcategory: segment };
}

/**
 * Map Marriner categories to normalized categories
 */
export function mapMarrinerCategory(
  title: string,
  venue: string
): { category: string; subcategory?: string } {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('musical') || titleLower.includes('mj the musical')) {
    return { category: 'performing-arts', subcategory: 'Musical' };
  }

  if (titleLower.includes('opera')) {
    return { category: 'performing-arts', subcategory: 'Opera' };
  }

  if (titleLower.includes('ballet') || titleLower.includes('nutcracker') || titleLower.includes('dance')) {
    return { category: 'performing-arts', subcategory: 'Dance' };
  }

  if (titleLower.includes('comedy') || venue.includes('Comedy')) {
    return { category: 'performing-arts', subcategory: 'Comedy' };
  }

  if (titleLower.includes('concert') || titleLower.includes('symphony') || titleLower.includes('orchestra')) {
    return { category: 'music', subcategory: 'Classical' };
  }

  return { category: 'performing-arts', subcategory: 'Theatre' };
}
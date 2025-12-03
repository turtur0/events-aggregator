export interface CategoryConfig {
  value: string;
  label: string;
  color: string; // RGB color for charts
  className: string; // CSS utility class from global.css
  subcategories?: string[];
}

export const CATEGORIES: CategoryConfig[] = [
  {
    value: 'music',
    label: 'Music',
    color: 'rgb(234 88 12)', // orange-600
    className: 'category-music',
    subcategories: [
      'Rock & Alternative',
      'Pop & Electronic',
      'Hip Hop & R&B',
      'Jazz & Blues',
      'Classical & Orchestra',
      'Country & Folk',
      'Metal & Punk',
      'World Music',
    ],
  },
  {
    value: 'theatre',
    label: 'Theatre',
    color: 'rgb(244 63 94)', // rose-600
    className: 'category-theatre',
    subcategories: [
      'Musicals',
      'Drama',
      'Comedy Shows',
      'Ballet & Dance',
      'Opera',
      'Cabaret',
      'Shakespeare',
      'Experimental',
    ],
  },
  {
    value: 'sports',
    label: 'Sports',
    color: 'rgb(20 184 166)', // teal-600
    className: 'category-sports',
    subcategories: [
      'AFL',
      'Cricket',
      'Soccer',
      'Basketball',
      'Tennis',
      'Rugby',
      'Motorsports',
      'Other Sports',
    ],
  },
  {
    value: 'arts',
    label: 'Arts & Culture',
    color: 'rgb(168 85 247)', // purple-600
    className: 'category-arts',
    subcategories: [
      'Comedy Festival',
      'Film & Cinema',
      'Art Exhibitions',
      'Literary Events',
      'Cultural Festivals',
      'Markets & Fairs',
    ],
  },
  {
    value: 'family',
    label: 'Family',
    color: 'rgb(16 185 129)', // emerald-600
    className: 'category-family',
    subcategories: [
      'Kids Shows',
      'Family Entertainment',
      'Educational',
      'Circus & Magic',
    ],
  },
  {
    value: 'other',
    label: 'Other',
    color: 'rgb(14 165 233)', // sky-600
    className: 'category-other',
    subcategories: [
      'Workshops',
      'Networking',
      'Wellness',
      'Community Events',
    ],
  },
];

/**
 * Shakespeare's major plays for automatic detection.
 * Includes most commonly performed and well-known works.
 */
export const SHAKESPEARE_PLAYS = [
  'hamlet',
  'macbeth',
  'romeo and juliet',
  'othello',
  'king lear',
  'a midsummer night\'s dream',
  'the tempest',
  'much ado about nothing',
  'twelfth night',
  'julius caesar',
  'as you like it',
  'the merchant of venice',
  'richard iii',
  'henry v',
  'the taming of the shrew',
  'measure for measure',
  'the winter\'s tale',
  'coriolanus',
  'antony and cleopatra',
  'richard ii',
];

// ===== HELPER FUNCTIONS =====

export function getCategoryLabel(value: string): string {
  const category = CATEGORIES.find(cat => cat.value === value);
  return category?.label || value;
}

export function getSubcategories(categoryValue: string): string[] {
  const category = CATEGORIES.find(cat => cat.value === categoryValue);
  return category?.subcategories || [];
}

export function isValidSubcategory(
  categoryValue: string,
  subcategory: string
): boolean {
  const subcategories = getSubcategories(categoryValue);
  return subcategories.includes(subcategory);
}

/**
 * Get color for a category (for charts and visualizations)
 */
export function getCategoryColor(categoryValue: string): string {
  const category = CATEGORIES.find(cat => cat.value === categoryValue);
  return category?.color || 'rgb(107 114 128)'; // gray-500 fallback
}

/**
 * Get CSS class name for a category badge
 */
export function getCategoryClassName(categoryValue: string): string {
  const category = CATEGORIES.find(cat => cat.value === categoryValue);
  return category?.className || 'border-2 border-border/50 bg-background hover:bg-muted transition-all';
}

/**
 * Create a color map for use in charts (legacy compatibility)
 */
export const CATEGORY_COLORS: Record<string, string> = CATEGORIES.reduce((acc, cat) => {
  acc[cat.value] = cat.color;
  return acc;
}, {} as Record<string, string>);
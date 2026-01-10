/**
 * All possible sources where users can interact with events.
 * Used for analytics and tracking user behaviour across the platform.
 */
export type EventSource =
    | 'search'           // User found event via search
    | 'recommendation'   // Event shown in personalised recommendations
    | 'category_browse'  // User browsing a specific category
    | 'homepage'         // Event displayed on homepage
    | 'direct'           // Direct link to event
    | 'similar_events'   // From "similar events" section
    | 'favourites';      // From user's favourites page

export type InteractionSource = EventSource;
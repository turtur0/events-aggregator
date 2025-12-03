'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getUserFavourites } from '@/lib/actions/interactions';

/**
 * Context type for managing user's favourited events
 * @property {Set<string>} favourites - Set of event IDs that the user has favourited
 * @property {boolean} isLoading - Whether favourites are currently being loaded
 * @property {Function} isFavourited - Check if an event is favourited
 * @property {Function} updateFavourite - Add or remove an event from favourites
 */
interface FavouritesContextType {
    favourites: Set<string>;
    isLoading: boolean;
    isFavourited: (eventId: string) => boolean;
    updateFavourite: (eventId: string, isFavourited: boolean) => void;
}

// Create context with default values
const FavouritesContext = createContext<FavouritesContextType>({
    favourites: new Set(),
    isLoading: true,
    isFavourited: () => false,
    updateFavourite: () => { },
});

/**
 * Provider component that manages user's favourited events globally.
 * Fetches favourites from the server when user is logged in and provides
 * methods to check and update favourite status throughout the app.
 */
export function FavouritesProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [favourites, setFavourites] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user's favourites when session changes
    useEffect(() => {
        if (session?.user?.id) {
            getUserFavourites(session.user.id).then(favs => {
                setFavourites(new Set(favs));
                setIsLoading(false);
            });
        } else {
            // Clear favourites if user logs out
            setFavourites(new Set());
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    /** Check if an event is in the user's favourites */
    const isFavourited = (eventId: string) => favourites.has(eventId);

    /** Add or remove an event from favourites optimistically (updates UI immediately) */
    const updateFavourite = (eventId: string, isFav: boolean) => {
        setFavourites(prev => {
            const next = new Set(prev);
            if (isFav) {
                next.add(eventId);
            } else {
                next.delete(eventId);
            }
            return next;
        });
    };

    return (
        <FavouritesContext.Provider value={{ favourites, isLoading, isFavourited, updateFavourite }}>
            {children}
        </FavouritesContext.Provider>
    );
}

/** Hook to access favourites context from any component */
export const useFavourites = () => useContext(FavouritesContext);
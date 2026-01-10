'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toggleFavourite } from '@/lib/actions/interactions';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { AuthModal } from '@/components/auth/AuthModals';
import type { EventSource } from '@/lib/types/events';

interface FavouriteButtonProps {
    eventId: string;
    initialFavourited?: boolean;
    source?: EventSource;
    variant?: 'icon' | 'button';
    className?: string;
}

export function FavouriteButton({
    eventId,
    initialFavourited = false,
    source = 'direct',
    variant = 'icon',
    className
}: FavouriteButtonProps) {
    const { data: session } = useSession();
    const [isFavourited, setIsFavourited] = useState(initialFavourited);
    const [isPending, startTransition] = useTransition();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Show auth modal if user not signed in
        if (!session?.user) {
            setShowAuthModal(true);
            return;
        }

        // Optimistic update for immediate feedback
        setIsFavourited(!isFavourited);

        startTransition(async () => {
            const result = await toggleFavourite(eventId, source);

            if (!result.success) {
                // Revert on failure
                setIsFavourited(isFavourited);
            } else {
                setIsFavourited(result.isFavourited);
            }
        });
    };

    if (variant === 'button') {
        return (
            <>
                <Button
                    variant={isFavourited ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleClick}
                    disabled={isPending}
                    className={cn(
                        "transition-all duration-200",
                        isFavourited
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "btn-outline-primary",
                        isPending && "opacity-50",
                        className
                    )}
                >
                    <Heart
                        className={cn(
                            'h-4 w-4 mr-2 transition-all duration-200',
                            isFavourited && 'fill-current scale-110'
                        )}
                    />
                    {isFavourited ? 'Saved' : 'Save'}
                </Button>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    defaultView="signin"
                />
            </>
        );
    }

    return (
        <>
            <button
                onClick={handleClick}
                disabled={isPending}
                className={cn(
                    'p-2 rounded-full transition-all duration-200',
                    'bg-black/50 hover:bg-black/70 backdrop-blur-sm',
                    'active:scale-95',
                    isPending && 'opacity-50 cursor-not-allowed',
                    className
                )}
                aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
            >
                <Heart
                    className={cn(
                        'h-5 w-5 transition-all duration-200',
                        isFavourited
                            ? 'fill-red-500 text-red-500 scale-110'
                            : 'text-white hover:scale-110'
                    )}
                />
            </button>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                defaultView="signin"
            />
        </>
    );
}
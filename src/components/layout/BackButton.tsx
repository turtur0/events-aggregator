'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BackButtonProps {
    fallbackUrl?: string;
    className?: string;
}

export function BackButton({ fallbackUrl = '/', className }: BackButtonProps) {
    const router = useRouter();
    const entryPathRef = useRef<string | null>(null);

    useEffect(() => {
        // Store the entry path when component mounts (only once)
        if (entryPathRef.current === null) {
            entryPathRef.current = window.location.pathname;
        }
    }, []);

    const handleBack = () => {
        const currentPath = window.location.pathname;

        // If we're still on the same page we entered on, use browser back
        if (entryPathRef.current === currentPath && window.history.length > 1) {
            router.back();
        } else {
            // Otherwise go to fallback (handles direct navigation case)
            router.push(fallbackUrl);
        }
    };

    return (
        <Button variant="ghost" onClick={handleBack} className={className}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
        </Button>
    );
}

'use client';

import { trackClickthrough } from '@/lib/actions/interactions';
import { Button } from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';

interface BookingLinkProps {
    eventId: string;
    href: string;
    children?: React.ReactNode;
    className?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function BookingLink({
    eventId,
    href,
    children = 'Get Tickets',
    className,
    variant = 'default',
    size = 'lg'
}: BookingLinkProps) {
    const handleClick = () => {
        trackClickthrough(eventId, 'direct');
    };

    return (
        <Button
            asChild
            className={className}
            size={size}
            variant={variant}
        >
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="flex items-centre justify-centre group"
            >
                {children}
                <ExternalLink
                    className="h-4 w-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    aria-hidden="true"
                />
            </a>
        </Button>
    );
}
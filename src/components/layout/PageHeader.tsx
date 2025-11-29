// components/layout/PageHeader.tsx
import { LucideIcon } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    // Icon props
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;

    // Content
    title: string;
    description?: string;

    // Optional badge
    badge?: {
        text: string;
        className?: string;
    };

    // Optional actions (buttons, etc)
    actions?: React.ReactNode;

    // Layout options
    showBackButton?: boolean;
    backButtonUrl?: string;
    containerClassName?: string;
}

export function PageHeader({
    icon: Icon,
    iconColor = 'text-primary',
    iconBgColor = 'bg-primary/10 ring-1 ring-primary/20',
    title,
    description,
    badge,
    actions,
    showBackButton = true,
    backButtonUrl = '/',
    containerClassName,
}: PageHeaderProps) {
    return (
        <section className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className={cn(
                'container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12',
                containerClassName
            )}>
                {/* Back button */}
                {showBackButton && <BackButton fallbackUrl={backButtonUrl} className="mb-6" />}

                {/* Header content */}
                <div className="flex items-start justify-between flex-wrap gap-6">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={cn('rounded-2xl p-3', iconBgColor)}>
                            <Icon className={cn('h-8 w-8', iconColor)} />
                        </div>

                        {/* Title and description */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-lg text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Badge or actions */}
                    <div className="flex items-center gap-3">
                        {badge && (
                            <Badge variant="secondary" className={cn('text-base px-4 py-2', badge.className)}>
                                {badge.text}
                            </Badge>
                        )}
                        {actions}
                    </div>
                </div>
            </div>
        </section>
    );
}
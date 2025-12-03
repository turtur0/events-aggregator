import { LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
    // Header props
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    title: string;
    description?: string;
    badge?: {
        text: string;
        className?: string;
    };
    actions?: React.ReactNode;
    showBackButton?: boolean;
    backButtonUrl?: string;

    // Content
    children: React.ReactNode;

    // Layout options
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full';
    backgroundGradient?: string;
    contentClassName?: string;
}

const MAX_WIDTH_CLASSES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
};

export function PageLayout({
    icon,
    iconColor,
    iconBgColor,
    title,
    description,
    badge,
    actions,
    showBackButton = true,
    backButtonUrl = '/',
    children,
    maxWidth = '4xl',
    backgroundGradient,
    contentClassName,
}: PageLayoutProps) {
    return (
        <div className={cn(
            'w-full min-h-screen',
            backgroundGradient || 'bg-linear-to-b from-background via-orange-50/30 to-background dark:from-background dark:via-orange-950/5 dark:to-background'
        )}>
            {/* Header */}
            <PageHeader
                icon={icon}
                iconColor={iconColor}
                iconBgColor={iconBgColor}
                title={title}
                description={description}
                badge={badge}
                actions={actions}
                showBackButton={showBackButton}
                backButtonUrl={backButtonUrl}
            />

            {/* Content */}
            <section className={cn(
                'container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12',
                MAX_WIDTH_CLASSES[maxWidth],
                contentClassName
            )}>
                <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </section>
        </div>
    );
}
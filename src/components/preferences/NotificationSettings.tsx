'use client';

import { Bell, Mail, Filter, Zap, Sparkles, Settings2, Heart } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { DIGEST_RECOMMENDATIONS_OPTIONS, type DigestRecommendationsSize } from '@/lib/constants/preferences';

interface NotificationSettingsProps {
    inAppNotifications: boolean;
    emailNotifications: boolean;
    emailFrequency: 'weekly' | 'monthly';
    keywords: string;
    useSmartFiltering: boolean;
    minRecommendationScore: number;
    includeFavouriteUpdates?: boolean;
    recommendationsSize?: DigestRecommendationsSize;
    customRecommendationsCount?: number;
    onInAppChange: (enabled: boolean) => void;
    onEmailChange: (enabled: boolean) => void;
    onFrequencyChange: (frequency: 'weekly' | 'monthly') => void;
    onKeywordsChange: (keywords: string) => void;
    onSmartFilteringChange: (enabled: boolean) => void;
    onScoreChange: (score: number) => void;
    onFavouriteUpdatesChange?: (enabled: boolean) => void;
    onRecommendationsSizeChange?: (size: DigestRecommendationsSize) => void;
    onCustomCountChange?: (count: number) => void;
    variant?: 'onboarding' | 'settings';
}

export function NotificationSettings({
    inAppNotifications,
    emailNotifications,
    emailFrequency,
    keywords,
    useSmartFiltering,
    minRecommendationScore,
    includeFavouriteUpdates = true,
    recommendationsSize = 'moderate',
    customRecommendationsCount = 5,
    onInAppChange,
    onEmailChange,
    onFrequencyChange,
    onKeywordsChange,
    onSmartFilteringChange,
    onScoreChange,
    onFavouriteUpdatesChange,
    onRecommendationsSizeChange,
    onCustomCountChange,
    variant = 'settings',
}: NotificationSettingsProps) {
    const isOnboarding = variant === 'onboarding';

    const getFrequencyLabel = (freq: 'weekly' | 'monthly') => {
        if (freq === 'weekly') return 'Weekly digest (Every Sunday at 6 PM)';
        if (freq === 'monthly') return 'Monthly digest (First Sunday of month)';
    };

    return (
        <div className="space-y-6">
            {/* In-App Notifications */}
            <div className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-1 flex-1">
                    <Label htmlFor="inApp" className="text-base font-medium cursor-pointer">
                        In-App Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Get notified about new matching events
                    </p>
                </div>
                <Checkbox
                    id="inApp"
                    checked={inAppNotifications}
                    onCheckedChange={(checked) => onInAppChange(checked === true)}
                    className="mt-1"
                />
            </div>

            {/* Email Notifications */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="space-y-1 flex-1">
                        <Label htmlFor="email" className="text-base font-medium cursor-pointer flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Receive email digests
                        </p>
                    </div>
                    <Checkbox
                        id="email"
                        checked={emailNotifications}
                        onCheckedChange={(checked) => onEmailChange(checked === true)}
                        className="mt-1"
                    />
                </div>

                {emailNotifications && (
                    <div className="ml-4 space-y-4">
                        {/* Email Frequency */}
                        <div className="p-4 bg-background border rounded-lg space-y-3">
                            <Label className="text-sm font-medium">Email Frequency</Label>
                            <div className="space-y-2">
                                {(['weekly', 'monthly'] as const).map((freq) => (
                                    <div key={freq} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            id={freq}
                                            checked={emailFrequency === freq}
                                            onChange={() => onFrequencyChange(freq)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                        <Label htmlFor={freq} className="cursor-pointer text-sm flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5" />
                                            {getFrequencyLabel(freq)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Favourite Updates Toggle */}
                        {onFavouriteUpdatesChange && (
                            <div className="p-4 bg-background border rounded-lg">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <Label htmlFor="favouriteUpdates" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                            <Heart className="h-4 w-4" />
                                            Include Favourite Updates
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Get notified when your saved events are updated
                                        </p>
                                    </div>
                                    <Checkbox
                                        id="favouriteUpdates"
                                        checked={includeFavouriteUpdates}
                                        onCheckedChange={(checked) => onFavouriteUpdatesChange(checked === true)}
                                        className="mt-0.5"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Recommendations Size */}
                        {onRecommendationsSizeChange && (
                            <div className="p-4 bg-background border rounded-lg space-y-3">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Settings2 className="h-4 w-4" />
                                    Recommendations Per Category
                                </Label>
                                <div className="space-y-2">
                                    {DIGEST_RECOMMENDATIONS_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        const isCustom = option.value === 'custom';
                                        
                                        return (
                                            <div key={option.value} className="flex items-start gap-3">
                                                <input
                                                    type="radio"
                                                    id={`recs-${option.value}`}
                                                    checked={recommendationsSize === option.value}
                                                    onChange={() => onRecommendationsSizeChange(option.value)}
                                                    className="w-4 h-4 mt-1 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <Label 
                                                        htmlFor={`recs-${option.value}`} 
                                                        className="cursor-pointer text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Icon className="h-3.5 w-3.5" />
                                                        {option.label}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {option.description}
                                                        {!isCustom && <span className="font-mono ml-1">({option.count} events)</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Custom Count Slider */}
                                {recommendationsSize === 'custom' && onCustomCountChange && (
                                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                                        <Label className="text-xs mb-2 block">
                                            Events Per Category: {customRecommendationsCount}
                                        </Label>
                                        <Slider
                                            value={[customRecommendationsCount]}
                                            onValueChange={([value]) => onCustomCountChange(value)}
                                            min={1}
                                            max={20}
                                            step={1}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Choose how many event recommendations you want per category
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground px-4">
                            Curated events matching your preferences and keyword alerts
                        </p>
                    </div>
                )}
            </div>

            {variant === 'settings' && <Separator />}

            {/* Keywords */}
            <div className="space-y-3">
                <Label htmlFor="keywords" className="flex items-center gap-2 text-base font-medium">
                    <Filter className="h-4 w-4" />
                    Keywords (Optional)
                </Label>
                <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => onKeywordsChange(e.target.value)}
                    placeholder="e.g., taylor swift, hamilton, comedy"
                    className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                    Get priority notifications for these keywords (comma-separated)
                </p>
            </div>

            {variant === 'settings' && <Separator />}

            {/* Smart Filtering */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="space-y-1 flex-1">
                        <Label htmlFor="smartFilter" className="text-base font-medium cursor-pointer flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Smart Filtering
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Only notify about events matching your event type preference
                        </p>
                    </div>
                    <Checkbox
                        id="smartFilter"
                        checked={useSmartFiltering}
                        onCheckedChange={(checked) => onSmartFilteringChange(checked === true)}
                        className="mt-1"
                    />
                </div>

                {useSmartFiltering && (
                    <div className="ml-4 p-4 bg-background border rounded-lg space-y-4">
                        <div>
                            <Label className="text-sm font-medium mb-3 block">
                                Minimum Match Score: {Math.round(minRecommendationScore * 100)}%
                            </Label>
                            <Slider
                                value={[minRecommendationScore]}
                                onValueChange={([value]) => onScoreChange(value)}
                                min={0.3}
                                max={0.9}
                                step={0.1}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Higher scores mean fewer but more relevant notifications
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-start gap-2 p-3 bg-background/50 rounded border">
                            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            Notifications will respect your Event Type Preference
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
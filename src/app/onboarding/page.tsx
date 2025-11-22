'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CATEGORIES } from '../lib/categories';
import { Loader2, ChevronRight } from 'lucide-react';

const MIN_CATEGORIES = 2;

export default function Onboarding() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [step, setStep] = useState<'categories' | 'subcategories' | 'preferences' | 'notifications'>(
        'categories'
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Main categories
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

    // Step 2: Subcategories
    const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());

    // Step 3: Preferences
    const [popularityPref, setPopularityPref] = useState(0.5);

    // Step 4: Notifications
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [emailFrequency, setEmailFrequency] = useState<'daily' | 'weekly'>('weekly');

    if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return null;
    }

    // Get subcategories for selected main categories
    const availableSubcategories = CATEGORIES.filter((cat) =>
        selectedCategories.has(cat.value)
    ).flatMap((cat) => cat.subcategories || []);

    const toggleCategory = (categoryValue: string) => {
        const newSet = new Set(selectedCategories);
        if (newSet.has(categoryValue)) {
            newSet.delete(categoryValue);
        } else {
            newSet.add(categoryValue);
        }
        setSelectedCategories(newSet);
        setError(''); // Clear error when user makes changes
    };

    const toggleSubcategory = (subcategoryValue: string) => {
        const newSet = new Set(selectedSubcategories);
        if (newSet.has(subcategoryValue)) {
            newSet.delete(subcategoryValue);
        } else {
            newSet.add(subcategoryValue);
        }
        setSelectedSubcategories(newSet);
    };

    const handleContinueFromCategories = () => {
        if (selectedCategories.size < MIN_CATEGORIES) {
            setError(`Please select at least ${MIN_CATEGORIES} categories`);
            return;
        }
        setError('');
        setStep('subcategories');
    };

    const handleContinueFromSubcategories = () => {
        setStep('preferences');
    };

    async function handleComplete() {
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedCategories: Array.from(selectedCategories),
                    selectedSubcategories: Array.from(selectedSubcategories),
                    popularityPreference: popularityPref,
                    notifications: {
                        email: notificationsEnabled,
                        emailFrequency: notificationsEnabled ? emailFrequency : 'weekly',
                        inApp: true,
                    },
                }),
            });

            if (!res.ok) throw new Error('Failed to save preferences');

            // Update the session with new onboarding status
            await update({ hasCompletedOnboarding: true });

            router.push('/');
            router.refresh();
        } catch (error: any) {
            setError(error.message || 'Failed to save preferences');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-background to-muted p-4">
            <div className="max-w-2xl mx-auto py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Personalize Your Experience</h1>
                    <p className="text-muted-foreground">
                        Let us know what types of events you like, and we'll recommend the best ones for you.
                    </p>
                </div>

                {/* Step 1: Select Main Categories */}
                {step === 'categories' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>What event categories interest you?</CardTitle>
                            <CardDescription>
                                Select at least {MIN_CATEGORIES} categories (you can always change this later)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {CATEGORIES.map((category) => (
                                    <div key={category.value} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={category.value}
                                            checked={selectedCategories.has(category.value)}
                                            onCheckedChange={() => toggleCategory(category.value)}
                                        />
                                        <Label
                                            htmlFor={category.value}
                                            className="cursor-pointer font-medium flex-1"
                                        >
                                            {category.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={handleContinueFromCategories}
                                className="w-full mt-6"
                            >
                                Continue
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Select Subcategories */}
                {step === 'subcategories' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Refine your interests</CardTitle>
                            <CardDescription>
                                Select specific types within your chosen categories (optional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {CATEGORIES.filter((cat) => selectedCategories.has(cat.value)).map(
                                (category) => (
                                    <div key={category.value}>
                                        <h3 className="font-semibold mb-3">{category.label}</h3>
                                        <div className="grid grid-cols-1 gap-2 ml-2">
                                            {category.subcategories?.map((sub) => (
                                                <div key={sub} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={sub}
                                                        checked={selectedSubcategories.has(sub)}
                                                        onCheckedChange={() => toggleSubcategory(sub)}
                                                    />
                                                    <Label htmlFor={sub} className="cursor-pointer text-sm">
                                                        {sub}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('categories')}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleContinueFromSubcategories}
                                    className="flex-1"
                                >
                                    Continue
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Popularity Preference */}
                {step === 'preferences' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Preferences</CardTitle>
                            <CardDescription>Do you prefer mainstream or niche events?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <Label>Event Type Preference</Label>
                                    <span className="text-sm font-semibold">
                                        {popularityPref === 0
                                            ? 'Niche Only'
                                            : popularityPref === 1
                                                ? 'Mainstream Only'
                                                : 'Balanced'}
                                    </span>
                                </div>

                                {/* Segmented Control instead of slider */}
                                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                                    {[
                                        { value: 0, label: 'Niche Gems' },
                                        { value: 0.5, label: 'Balanced' },
                                        { value: 1, label: 'Mainstream' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setPopularityPref(option.value)}
                                            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${popularityPref === option.value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-background'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground mt-3">
                                    {popularityPref === 0
                                        ? '🔍 Hidden indie events, smaller venues, emerging artists'
                                        : popularityPref === 1
                                            ? '⭐ Popular events, major venues, well-known acts'
                                            : '🎯 Mix of both popular and unique events'}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('subcategories')}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button onClick={() => setStep('notifications')} className="flex-1">
                                    Continue
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Notifications */}
                {step === 'notifications' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Stay Updated</CardTitle>
                            <CardDescription>
                                How would you like to receive event recommendations?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="email-notifications"
                                    checked={notificationsEnabled}
                                    onCheckedChange={(checked) => setNotificationsEnabled(checked === true)}
                                />
                                <Label htmlFor="email-notifications" className="cursor-pointer">
                                    Send me email updates about new events
                                </Label>
                            </div>

                            {notificationsEnabled && (
                                <div className="ml-6 space-y-3 p-3 bg-muted rounded-lg">
                                    <Label className="font-medium">Email Frequency</Label>
                                    <div className="space-y-2">
                                        {(['daily', 'weekly'] as const).map((freq) => (
                                            <div key={freq} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    id={freq}
                                                    name="frequency"
                                                    value={freq}
                                                    checked={emailFrequency === freq}
                                                    onChange={(e) => setEmailFrequency(e.target.value as 'daily' | 'weekly')}
                                                    className="w-4 h-4"
                                                />
                                                <Label htmlFor={freq} className="capitalize cursor-pointer text-sm">
                                                    {freq === 'daily'
                                                        ? 'Daily digest (best events from today)'
                                                        : 'Weekly digest (highlights from the week)'}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                💡 You can always change these settings in your profile
                            </p>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('preferences')}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleComplete}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Let's Go!
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Progress Indicator */}
                <div className="flex gap-2 mt-8 justify-center">
                    {(['categories', 'subcategories', 'preferences', 'notifications'] as const).map((s, idx) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all ${step === s
                                ? 'bg-primary w-8'
                                : ['categories', 'subcategories', 'preferences', 'notifications'].indexOf(step) > idx
                                    ? 'bg-primary w-2'
                                    : 'bg-muted w-2'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
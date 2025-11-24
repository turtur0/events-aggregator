'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Loader2,
    Save,
    User,
    Bell,
    Sparkles,
    Check,
    AlertCircle,
    Trash2,
    Lock,
} from 'lucide-react';
import { useEnsureOnboarding } from '@/lib/hooks/useAuthRedirect';
import { CATEGORIES } from '@/lib/categories';

export default function SettingsPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();

    // Account info
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Preferences
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
    const [popularityPref, setPopularityPref] = useState(0.5);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [emailFrequency, setEmailFrequency] = useState<'daily' | 'weekly'>('weekly');

    // Original values for comparison
    const [originalValues, setOriginalValues] = useState<any>(null);

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Dialogs
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

    // Load initial data
    useEffect(() => {
        async function loadSettings() {
            if (status === 'loading') return;

            try {
                const [prefsRes, userRes] = await Promise.all([
                    fetch('/api/user/preferences'),
                    fetch('/api/user/account'),
                ]);

                const prefsData = await prefsRes.json();
                const userData = await userRes.json();

                // Set account info
                setName(userData.name || '');
                setUsername(userData.username || '');
                setEmail(userData.email || '');

                // Set preferences
                const prefs = prefsData.preferences;
                setSelectedCategories(new Set(prefs.selectedCategories));
                setSelectedSubcategories(new Set(prefs.selectedSubcategories));
                setPopularityPref(prefs.popularityPreference);
                setNotificationsEnabled(prefs.notifications.email);
                setEmailFrequency(prefs.notifications.emailFrequency);

                // Store original values
                setOriginalValues({
                    name: userData.name || '',
                    username: userData.username || '',
                    selectedCategories: new Set(prefs.selectedCategories),
                    selectedSubcategories: new Set(prefs.selectedSubcategories),
                    popularityPref: prefs.popularityPreference,
                    notificationsEnabled: prefs.notifications.email,
                    emailFrequency: prefs.notifications.emailFrequency,
                });
            } catch (error) {
                setError('Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        }

        loadSettings();
    }, [session, status]);

    // Check for unsaved changes
    useEffect(() => {
        if (!originalValues) return;

        const hasChanges =
            name !== originalValues.name ||
            username !== originalValues.username ||
            !areSetsEqual(selectedCategories, originalValues.selectedCategories) ||
            !areSetsEqual(selectedSubcategories, originalValues.selectedSubcategories) ||
            popularityPref !== originalValues.popularityPref ||
            notificationsEnabled !== originalValues.notificationsEnabled ||
            emailFrequency !== originalValues.emailFrequency ||
            currentPassword !== '' ||
            newPassword !== '';

        setHasUnsavedChanges(hasChanges);
    }, [
        name,
        username,
        selectedCategories,
        selectedSubcategories,
        popularityPref,
        notificationsEnabled,
        emailFrequency,
        currentPassword,
        newPassword,
        originalValues,
    ]);

    // Warn before leaving page
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    function areSetsEqual(a: Set<string>, b: Set<string>) {
        return a.size === b.size && [...a].every((val) => b.has(val));
    }

    function toggleCategory(categoryValue: string) {
        const newSet = new Set(selectedCategories);
        if (newSet.has(categoryValue)) {
            newSet.delete(categoryValue);
            const category = CATEGORIES.find((c) => c.value === categoryValue);
            if (category?.subcategories) {
                const newSubs = new Set(selectedSubcategories);
                category.subcategories.forEach((sub) => newSubs.delete(sub));
                setSelectedSubcategories(newSubs);
            }
        } else {
            newSet.add(categoryValue);
        }
        setSelectedCategories(newSet);
    }

    function toggleSubcategory(subcategoryValue: string) {
        const newSet = new Set(selectedSubcategories);
        newSet.has(subcategoryValue) ? newSet.delete(subcategoryValue) : newSet.add(subcategoryValue);
        setSelectedSubcategories(newSet);
    }


    async function handleSave() {
        setError('');
        setSuccess(false);
        setIsSaving(true);

        try {
            // Validate password change if provided
            if (newPassword) {
                if (!currentPassword) {
                    throw new Error('Current password is required to set a new password');
                }
                if (newPassword.length < 8) {
                    throw new Error('New password must be at least 8 characters');
                }
                if (newPassword !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
            }

            // Update account info
            const accountRes = await fetch('/api/user/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    username: username || undefined,
                    currentPassword: currentPassword || undefined,
                    newPassword: newPassword || undefined,
                }),
            });

            if (!accountRes.ok) {
                const data = await accountRes.json();
                throw new Error(data.error || 'Failed to update account');
            }

            // Update preferences
            const prefsRes = await fetch('/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedCategories: Array.from(selectedCategories),
                    selectedSubcategories: Array.from(selectedSubcategories),
                    popularityPreference: popularityPref,
                    notifications: {
                        email: notificationsEnabled,
                        emailFrequency,
                        inApp: true,
                    },
                }),
            });

            if (!prefsRes.ok) throw new Error('Failed to save preferences');


            await update();

            // Clear password fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Update original values
            setOriginalValues({
                name,
                username,
                selectedCategories: new Set(selectedCategories),
                selectedSubcategories: new Set(selectedSubcategories),
                popularityPref,
                notificationsEnabled,
                emailFrequency,
            });

            setSuccess(true);

            // ✅ Redirect to profile after a short delay
            setTimeout(() => {
                router.push('/profile');
            }, 1500);

        } catch (error: any) {
            setError(error.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    }



    async function handleDelete() {
        if (deleteConfirmText !== 'DELETE') {
            setError('Please type DELETE to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch('/api/user/account', {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete account');

            // Redirect to home after deletion
            window.location.href = '/';
        } catch (error: any) {
            setError(error.message || 'Failed to delete account');
            setIsDeleting(false);
        }
    }

    function handleNavigation(href: string) {
        if (hasUnsavedChanges) {
            setPendingNavigation(href);
            setShowUnsavedDialog(true);
        } else {
            router.push(href);
        }
    }

    function confirmNavigation() {
        if (pendingNavigation) {
            router.push(pendingNavigation);
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <section className="bg-gradient-to-b from-primary/5 to-background">
                <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <Button
                        variant="ghost"
                        onClick={() => handleNavigation('/profile')}
                        className="mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Profile
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-4">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-1">Account Settings</h1>
                            <p className="text-muted-foreground">
                                Update your preferences and account information
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="space-y-6">
                    {/* Status Messages */}
                    {error && (
                        <div className="flex gap-3 p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-destructive">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex gap-3 p-4 bg-green-500/10 border-2 border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                            <Check className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>Settings saved successfully!</span>
                        </div>
                    )}

                    {/* Account Info */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Account Information
                            </CardTitle>
                            <CardDescription>Update your name and username</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="username">Username (optional)</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="johndoe"
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label>Email</Label>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {email} (cannot be changed)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password Change */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>Update your password</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preferences */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Event Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-base mb-3 block">Categories</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((category) => (
                                        <button
                                            key={category.value}
                                            onClick={() => toggleCategory(category.value)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategories.has(category.value)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80'
                                                }`}
                                        >
                                            {selectedCategories.has(category.value) && (
                                                <Check className="inline w-4 h-4 mr-1" />
                                            )}
                                            {category.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedCategories.size > 0 && (
                                <div>
                                    <Label className="text-base mb-3 block">Subcategories</Label>
                                    {CATEGORIES.filter((cat) => selectedCategories.has(cat.value)).map(
                                        (category) => (
                                            <div key={category.value} className="mb-4">
                                                <p className="text-sm font-medium mb-2">{category.label}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {category.subcategories?.map((sub) => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => toggleSubcategory(sub)}
                                                            className={`px-3 py-1.5 rounded-full text-xs transition-all ${selectedSubcategories.has(sub)
                                                                ? 'bg-primary/20 text-primary border border-primary'
                                                                : 'bg-background border border-border'
                                                                }`}
                                                        >
                                                            {sub}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            <Separator />

                            <div>
                                <Label className="text-base mb-3 block">Popularity</Label>
                                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                                    {[
                                        { value: 0, label: 'Niche', icon: '🔍' },
                                        { value: 0.5, label: 'Balanced', icon: '🎯' },
                                        { value: 1, label: 'Mainstream', icon: '⭐' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setPopularityPref(option.value)}
                                            className={`flex-1 py-3 rounded text-sm font-medium transition-all ${popularityPref === option.value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-background'
                                                }`}
                                        >
                                            {option.icon} {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="email-notifs"
                                    checked={notificationsEnabled}
                                    onCheckedChange={(checked) => setNotificationsEnabled(checked === true)}
                                />
                                <Label htmlFor="email-notifs" className="cursor-pointer">
                                    Email updates about new events
                                </Label>
                            </div>

                            {notificationsEnabled && (
                                <div className="ml-6 p-4 bg-muted rounded-lg">
                                    <Label className="block mb-2">Frequency</Label>
                                    {(['daily', 'weekly'] as const).map((freq) => (
                                        <div key={freq} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="radio"
                                                id={freq}
                                                name="frequency"
                                                checked={emailFrequency === freq}
                                                onChange={() => setEmailFrequency(freq)}
                                            />
                                            <Label htmlFor={freq} className="cursor-pointer">
                                                {freq === 'daily' ? '📧 Daily' : '📬 Weekly'}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleNavigation('/profile')}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} size="lg" className="flex-1">
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Delete Account */}
                    <Card className="border-2 border-destructive/20">
                        <CardHeader>
                            <CardTitle className="text-xl text-destructive flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                Danger Zone
                            </CardTitle>
                            <CardDescription>Permanently delete your account and all data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isDeleting}
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Unsaved Changes Dialog */}
            <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unsaved Changes</DialogTitle>
                        <DialogDescription>
                            You have unsaved changes. Do you want to save them before leaving?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={confirmNavigation}>
                            Leave Without Saving
                        </Button>
                        <Button
                            onClick={async () => {
                                await handleSave();
                                setShowUnsavedDialog(false);
                                if (pendingNavigation) router.push(pendingNavigation);
                            }}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. All your data, favourites, and preferences will be
                            permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Type DELETE to confirm</Label>
                        <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Forever'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

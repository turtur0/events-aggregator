'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, Mail, Moon, Sun, Monitor, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';

interface NotificationSettings {
    inApp: boolean;
    email: boolean;
    emailFrequency: 'instant' | 'daily' | 'weekly';
}

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const [notifications, setNotifications] = useState<NotificationSettings>({
        inApp: true,
        email: false,
        emailFrequency: 'weekly',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/settings');
        }
    }, [status, router]);

    // Fetch current settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await fetch('/api/user/preferences');
                if (response.ok) {
                    const data = await response.json();
                    if (data.preferences?.notifications) {
                        setNotifications(data.preferences.notifications);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (session?.user) {
            fetchSettings();
        }
    }, [session]);

    async function handleSaveNotifications() {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const response = await fetch('/api/user/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notifications,
                }),
            });

            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <main className="container py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </div>
            </main>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <main className="container py-8">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <Button variant="ghost" asChild className="mb-6">
                    <Link href="/profile">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Profile
                    </Link>
                </Button>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account preferences and notifications
                    </p>
                </div>

                {/* Appearance Settings */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Customise how Melbourne Events looks for you
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label>Theme</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred colour scheme
                                </p>
                            </div>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">
                                        <div className="flex items-center gap-2">
                                            <Sun className="h-4 w-4" />
                                            Light
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="dark">
                                        <div className="flex items-center gap-2">
                                            <Moon className="h-4 w-4" />
                                            Dark
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="system">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="h-4 w-4" />
                                            System
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notifications
                        </CardTitle>
                        <CardDescription>
                            Choose how you want to be notified about new events
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* In-App Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="inApp">In-app notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show notifications within the app
                                </p>
                            </div>
                            <Switch
                                id="inApp"
                                checked={notifications.inApp}
                                onCheckedChange={(checked) =>
                                    setNotifications(prev => ({ ...prev, inApp: checked }))
                                }
                            />
                        </div>

                        <Separator />

                        {/* Email Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="email">Email notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive event recommendations via email
                                </p>
                            </div>
                            <Switch
                                id="email"
                                checked={notifications.email}
                                onCheckedChange={(checked) =>
                                    setNotifications(prev => ({ ...prev, email: checked }))
                                }
                            />
                        </div>

                        {/* Email Frequency */}
                        {notifications.email && (
                            <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                                <div className="space-y-1">
                                    <Label>Email frequency</Label>
                                    <p className="text-sm text-muted-foreground">
                                        How often would you like to receive emails?
                                    </p>
                                </div>
                                <Select
                                    value={notifications.emailFrequency}
                                    onValueChange={(value: 'instant' | 'daily' | 'weekly') =>
                                        setNotifications(prev => ({ ...prev, emailFrequency: value }))
                                    }
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="instant">Instant</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Separator />

                        {/* Save Button */}
                        <div className="flex items-center justify-end gap-3">
                            {saveSuccess && (
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                    <Check className="h-4 w-4" />
                                    Saved
                                </span>
                            )}
                            <Button onClick={handleSaveNotifications} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Notifications'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Settings */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Address
                        </CardTitle>
                        <CardDescription>
                            Your email address is used for signing in and notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{session.user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                    Primary email address
                                </p>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Change Email
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200 dark:border-red-900">
                    <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions that affect your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Delete Account</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all associated data
                                </p>
                            </div>
                            <Button variant="destructive" size="sm" disabled>
                                Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
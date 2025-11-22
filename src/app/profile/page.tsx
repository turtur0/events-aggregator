'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Settings, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface UserPreferences {
  categories: Record<string, number>;
  priceRange: { min: number; max: number };
  popularityPreference: number;
  notifications: {
    inApp: boolean;
    email: boolean;
    emailFrequency: string;
  };
}

export default function Profile() {
  const { data: session } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/user/preferences');
        const data = await res.json();
        setPreferences(data.preferences);
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  async function handleSignOut() {
    await signOut({ redirect: true, callbackUrl: '/' });
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{session?.user?.name}</CardTitle>
                <CardDescription>{session?.user?.email}</CardDescription>
              </div>
              <Link href="/profile/settings">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </CardHeader>
          </Card>

          {/* Preferences Summary */}
          {!isLoading && preferences && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Category Preferences</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(preferences.categories).map(([cat, pref]) => (
                        <div key={cat} className="text-sm">
                          <span className="capitalize">{cat}</span>: <span className="font-semibold">{Math.round(pref as number)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Price Range</h3>
                    <p className="text-sm">
                      ${preferences.priceRange.min} - ${preferences.priceRange.max}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Event Type</h3>
                    <p className="text-sm">
                      {preferences.popularityPreference < 0.33
                        ? 'Niche & Hidden Gems'
                        : preferences.popularityPreference > 0.67
                        ? 'Popular Mainstream'
                        : 'Balanced Mix'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Notifications</h3>
                    <p className="text-sm">
                      {preferences.notifications.email
                        ? `Email: ${preferences.notifications.emailFrequency}`
                        : 'Notifications disabled'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Sign Out Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
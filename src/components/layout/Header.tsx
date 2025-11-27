'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, ChevronDown, Music, Theater, Trophy, Palette, Users, Sparkles, Menu, LogOut, Settings, User, Heart, BarChart3 } from "lucide-react";
import { ThemeToggle } from '../theme/ThemeToggle';
import { NotificationBell } from "../notifications/NotificationBell";
import { AuthModal } from '../auth/AuthModals';
import { Button } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

const CATEGORY_LINKS = [
  { label: "Music", slug: "music", icon: Music, description: "Concerts, gigs & live music" },
  { label: "Theatre", slug: "theatre", icon: Theater, description: "Plays, musicals & performances" },
  { label: "Sports", slug: "sports", icon: Trophy, description: "Games, matches & competitions" },
  { label: "Arts & Culture", slug: "arts", icon: Palette, description: "Exhibitions, film & festivals" },
  { label: "Family", slug: "family", icon: Users, description: "Kids shows & family fun" },
  { label: "Other", slug: "other", icon: Sparkles, description: "Workshops, networking & more" },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');

  // Handle URL-triggered auth modals
  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'signin' || authParam === 'signup') {
      setAuthModalView(authParam);
      setAuthModalOpen(true);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Check if we're on specific pages
  const isOnCategoryPage = pathname?.startsWith('/category/');
  const currentCategory = isOnCategoryPage ? pathname.split('/')[2] : null;
  const isOnEventsPage = pathname === '/events';
  const isOnBrowsePage = isOnCategoryPage || isOnEventsPage;
  const isOnInsightsPage = pathname === '/insights';
  const isOnNotificationsPage = pathname === '/notifications';
  const isOnSignInPage = pathname === '/signin';
  const isOnSignUpPage = pathname === '/signup';
  const isOnProfilePages = pathname === '/favourites' || pathname === '/profile' || pathname === '/settings';

  const openSignIn = () => {
    setAuthModalView('signin');
    setTimeout(() => setAuthModalOpen(true), 0);
  };

  const openSignUp = () => {
    setAuthModalView('signup');
    setTimeout(() => setAuthModalOpen(true), 0);
  };

  async function handleSignOut() {
    await signOut({ redirect: true, callbackUrl: '/' });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl">
          <span className="xs:inline">Melbourne Events</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Insights Link - Desktop */}
          <Link href="/insights" className="hidden md:block">
            <Button
              variant={isOnInsightsPage ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden lg:inline">Insights</span>
            </Button>
          </Link>

          {/* Browse Events Dropdown - Desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isOnBrowsePage ? 'default' : 'outline'}
                size="sm"
                className="hidden sm:flex gap-1"
              >
                Browse Events
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORY_LINKS.map((cat) => {
                const Icon = cat.icon;
                const isActive = currentCategory === cat.slug;
                return (
                  <DropdownMenuItem key={cat.slug} asChild>
                    <Link
                      href={`/category/${cat.slug}`}
                      className={cn(
                        "flex items-start gap-3 py-2",
                        isActive && "bg-accent"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className={cn(
                          "font-medium",
                          isActive && "text-primary"
                        )}>
                          {cat.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/events"
                  className={cn(
                    "flex items-center gap-3 py-2",
                    isOnEventsPage && "bg-accent"
                  )}
                >
                  <Search className={cn(
                    "h-5 w-5",
                    isOnEventsPage ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className={cn(
                      "font-medium",
                      isOnEventsPage && "text-primary"
                    )}>
                      All Events
                    </p>
                    <p className="text-xs text-muted-foreground">Search & filter everything</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* All Events */}
              <DropdownMenuItem asChild>
                <Link
                  href="/events"
                  className={cn(
                    "flex items-center gap-2",
                    isOnEventsPage && "bg-accent text-primary"
                  )}
                >
                  <Search className="h-4 w-4" />
                  All Events
                </Link>
              </DropdownMenuItem>

              {/* Insights */}
              <DropdownMenuItem asChild>
                <Link
                  href="/insights"
                  className={cn(
                    "flex items-center gap-2",
                    isOnInsightsPage && "bg-accent text-primary"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  Insights
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Categories</DropdownMenuLabel>

              {/* Categories */}
              {CATEGORY_LINKS.map((cat) => {
                const Icon = cat.icon;
                const isActive = currentCategory === cat.slug;
                return (
                  <DropdownMenuItem key={cat.slug} asChild>
                    <Link
                      href={`/category/${cat.slug}`}
                      className={cn(
                        "flex items-center gap-2",
                        isActive && "bg-accent text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/about">About</Link>
              </DropdownMenuItem>

              {/* User Menu Items (Mobile) */}
              {session?.user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/favourites"
                      className={cn(
                        "flex items-center gap-2",
                        pathname === '/favourites' && "bg-accent text-primary"
                      )}
                    >
                      <Heart className="h-4 w-4" />
                      My Favourites
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className={cn(
                        "flex items-center gap-2",
                        pathname === '/profile' && "bg-accent text-primary"
                      )}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/settings"
                      className={cn(
                        "flex items-center gap-2",
                        pathname === '/settings' && "bg-accent text-primary"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification Bell - Only show for authenticated users */}
          {session?.user && <NotificationBell isActive={isOnNotificationsPage} />}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Auth Buttons / User Menu - Desktop */}
          {status === 'loading' ? (
            <div className="hidden sm:block h-9 w-20 bg-muted rounded animate-pulse" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isOnProfilePages ? 'default' : 'outline'}
                  size="sm"
                  className="hidden sm:flex gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{session.user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col space-y-1">
                  <span className="font-medium">{session.user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{session.user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/favourites"
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      pathname === '/favourites' && "bg-accent text-primary"
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    My Favourites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      pathname === '/profile' && "bg-accent text-primary"
                    )}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      pathname === '/settings' && "bg-accent text-primary"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex gap-2">
              <Button variant="outline" size="sm" onClick={openSignIn}>
                Sign In
              </Button>
              <Button variant="outline" size="sm" onClick={openSignUp}>
                Sign Up
              </Button>
            </div>
          )}
        </nav>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultView={authModalView}
      />
    </header>
  );
}
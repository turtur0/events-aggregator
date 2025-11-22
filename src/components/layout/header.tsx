'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronDown, Music, Theater, Trophy, Laugh, PartyPopper, Sparkles } from "lucide-react";
import { ThemeToggle } from "../theme/theme-toggle";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_LINKS = [
  { label: "Music", slug: "music", icon: Music, description: "Concerts, gigs & live music" },
  { label: "Theatre", slug: "theatre", icon: Theater, description: "Plays, musicals & performances" },
  { label: "Sports", slug: "sports", icon: Trophy, description: "Games, matches & competitions" },
  { label: "Comedy", slug: "comedy", icon: Laugh, description: "Stand-up & comedy shows" },
  { label: "Festivals", slug: "festivals", icon: PartyPopper, description: "Multi-day events & celebrations" },
  { label: "Other", slug: "other", icon: Sparkles, description: "Exhibitions, talks & more" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex justify-center">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          Melbourne Events
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {/* Browse Events Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1">
                Browse Events
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORY_LINKS.map((cat) => {
                const Icon = cat.icon;
                return (
                  <DropdownMenuItem key={cat.slug} asChild>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="flex items-start gap-3 py-2"
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/events" className="flex items-center gap-3 py-2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">All Events</p>
                    <p className="text-xs text-muted-foreground">Search & filter everything</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Link (mobile-friendly) */}
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/events">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search events</span>
            </Link>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
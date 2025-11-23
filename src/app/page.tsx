import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Music, Theater, Trophy, Palette, Users, Sparkles, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search/search-bar";
import { ForYouSection } from "@/components/recommendations/for-you-section";
import { TrendingSection } from "@/components/recommendations/trending-section";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { connectDB } from "@/lib/db";
import Event from "@/lib/models/Event";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserFavourites } from "@/actions/interactions";

const CATEGORIES = [
  { label: "Music", slug: "music", icon: Music, color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
  { label: "Theatre", slug: "theatre", icon: Theater, color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" },
  { label: "Sports", slug: "sports", icon: Trophy, color: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
  { label: "Arts & Culture", slug: "arts", icon: Palette, color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" },
  { label: "Family", slug: "family", icon: Users, color: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20" },
  { label: "Other", slug: "other", icon: Sparkles, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
];

async function getStats() {
  await connectDB();
  const totalEvents = await Event.countDocuments({ startDate: { $gte: new Date() } });
  const sources = await Event.distinct('primarySource');
  return { totalEvents, sourceCount: sources.length };
}

function CarouselSkeleton() {
  return (
    <Card>
      <div className="p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
              <div className="h-80 bg-muted rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default async function HomePage() {
  const { totalEvents, sourceCount } = await getStats();

  const session = await getServerSession(authOptions);
  let userFavourites = new Set<string>();

  if (session?.user?.id) {
    const favouriteIds = await getUserFavourites(session.user.id);
    userFavourites = new Set(favouriteIds);
  }

  const isLoggedIn = !!session?.user;

  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-background">
        <div className="container py-12 sm:py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Updated daily from {sourceCount} sources
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
              Discover What's On in{" "}
              <span className="text-primary">Melbourne</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-4">
              Your one-stop guide to concerts, theatre, sports, festivals and more.
              Find your next experience from {totalEvents.toLocaleString()}+ events.
            </p>

            <div className="max-w-xl mx-auto mb-6 px-4">
              <Suspense fallback={<div className="h-12 bg-muted animate-pulse rounded" />}>
                <SearchBar />
              </Suspense>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 px-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/events">
                  Browse All Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link href="/category/music">
                  <Music className="mr-2 h-4 w-4" />
                  Live Music
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-2">
          <div>
            <h2 className="text-2xl font-bold">Browse by Category</h2>
            <p className="text-muted-foreground">Find events that match your interests</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl border transition-all hover:scale-105 ${cat.color}`}
              >
                <Icon className="h-6 w-6 sm:h-8 sm:w-8 mb-2" />
                <span className="font-medium text-center text-xs sm:text-sm">{cat.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* For You Section (Logged in users only) */}
      {isLoggedIn && (
        <section className="container py-8 sm:py-12">
          <Suspense fallback={<CarouselSkeleton />}>
            <ForYouSection userFavourites={userFavourites} />
          </Suspense>
        </section>
      )}

      {/* Trending Section (Always shown) */}
      <section className="container py-8 sm:py-12">
        <Suspense fallback={<CarouselSkeleton />}>
          <TrendingSection userFavourites={userFavourites} />
        </Suspense>
      </section>

      {/* Combined Upcoming Events Section */}
      <section className="container py-8 sm:py-12">
        <Suspense fallback={<CarouselSkeleton />}>
          <UpcomingEvents userFavourites={userFavourites} />
        </Suspense>
      </section>

      {/* Stats Section */}
      <section className="container py-8 sm:py-12 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="text-center bg-linear-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <p className="text-3xl sm:text-4xl font-bold text-primary">{totalEvents.toLocaleString()}+</p>
              <p className="text-sm text-muted-foreground">Events Listed</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-linear-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardContent className="pt-6">
              <p className="text-3xl sm:text-4xl font-bold text-blue-500">{sourceCount}</p>
              <p className="text-sm text-muted-foreground">Data Sources</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-linear-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardContent className="pt-6">
              <p className="text-3xl sm:text-4xl font-bold text-green-500">Daily</p>
              <p className="text-sm text-muted-foreground">Auto Updates</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
// app/about/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLayout } from '@/components/layout/PageLayout';
import {
    Database,
    Shield,
    Clock,
    Mail,
    Github,
    Heart,
    ExternalLink,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "About | Melbourne Events",
    description: "Learn about Melbourne Events, our data sources, and ethical practices.",
};

const DATA_SOURCES = [
    {
        name: 'Ticketmaster',
        url: 'https://www.ticketmaster.com.au/',
        badge: { label: 'Primary', variant: 'default' as const },
        description: 'Major concerts, sports events, and theatre productions via their official Discovery API.',
    },
    {
        name: 'Marriner Group',
        url: 'https://marrinergroup.com.au/',
        badge: { label: 'Venue', variant: 'secondary' as const },
        description: 'Theatre, musicals, and performing arts from Melbourne\'s premier entertainment venues.',
        venues: ['Regent Theatre', 'Princess Theatre', 'Comedy Theatre', 'Forum Melbourne', 'Plaza Ballroom'],
    },
    {
        name: 'What\'s On Melbourne',
        url: 'https://whatson.melbourne.vic.gov.au/',
        badge: { label: 'Secondary', variant: 'outline' as const },
        description: 'Community events, festivals, and cultural activities curated by the City of Melbourne.',
    },
];

const ETHICAL_PRACTICES = [
    {
        title: "API-first approach",
        desc: "We use official APIs wherever available (Ticketmaster Discovery API)."
    },
    {
        title: "robots.txt compliance",
        desc: "We respect crawling restrictions and terms of service."
    },
    {
        title: "Rate limiting",
        desc: "We implement intelligent delays and never overload source servers."
    },
    {
        title: "Direct attribution",
        desc: "We always link directly to the original ticketing source for bookings."
    },
    {
        title: "No personal data",
        desc: "We only collect publicly available event information."
    },
    {
        title: "No ticket sales",
        desc: "We don't sell tickets - all bookings go directly to official sources."
    },
];

export default function AboutPage() {
    return (
        <PageLayout
            icon={Sparkles}
            iconColor="text-primary"
            iconBgColor="bg-primary/10 ring-1 ring-primary/20"
            title="About Melbourne Events"
            description="A comprehensive events aggregator built to help Melburnians discover what's happening in their city"
            maxWidth="4xl"
        >
            <div className="space-y-8">
                {/* Mission */}
                <Card className="card-interactive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Heart className="h-6 w-6 text-primary" />
                            Our Mission
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base leading-relaxed">
                        <p className="text-muted-foreground">
                            Melbourne is one of the world's most vibrant cities for live events,
                            but finding what's on can be frustrating. Event information is scattered
                            across multiple ticketing platforms, venue websites, and social media.
                        </p>
                        <p className="text-muted-foreground">
                            Melbourne Events solves this by aggregating events from multiple trusted
                            sources into one searchable, filterable platform. Whether you're looking
                            for a concert tonight or planning ahead for festival season, we've got you covered.
                        </p>
                    </CardContent>
                </Card>

                {/* Data Sources */}
                <Card className="card-interactive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Database className="h-6 w-6 text-primary" />
                            Data Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6 text-base">
                            We aggregate event data from the following trusted sources:
                        </p>
                        <div className="space-y-4">
                            {DATA_SOURCES.map((source) => (
                                <div key={source.name} className="p-6 rounded-xl border-2 bg-muted/30 transition-all hover:shadow-sm hover-lift">
                                    <div className="flex items-start gap-4">
                                        <Badge variant={source.badge.variant} className="mt-1">
                                            {source.badge.label}
                                        </Badge>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-bold text-lg">{source.name}</h4>
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80 transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>
                                            <p className="text-muted-foreground mb-3">
                                                {source.description}
                                            </p>
                                            {source.venues && (
                                                <div className="flex flex-wrap gap-2">
                                                    {source.venues.map(venue => (
                                                        <Badge
                                                            key={venue}
                                                            variant="outline"
                                                            className="badge-outline-hover"
                                                        >
                                                            {venue}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-5 rounded-xl border-2 bg-muted/30">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                <strong className="text-foreground">Note:</strong> We automatically deduplicate events
                                that appear across multiple sources, merging information to provide you with the most
                                complete and accurate event details.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Ethical Practices */}
                <Card className="card-interactive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Shield className="h-6 w-6 text-primary" />
                            Ethical Data Practices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6 text-base">
                            We take data ethics seriously. Here's how we operate responsibly:
                        </p>
                        <ul className="space-y-3">
                            {ETHICAL_PRACTICES.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 transition-all hover:shadow-sm hover-lift">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-foreground">{item.title}:</strong>{" "}
                                        <span className="text-muted-foreground">{item.desc}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Update Frequency */}
                <Card className="card-interactive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Clock className="h-6 w-6 text-primary" />
                            Update Frequency
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-base">
                            Our database is automatically updated daily via scheduled jobs. This ensures
                            you always see the latest events, accurate pricing, and up-to-date availability.
                        </p>
                    </CardContent>
                </Card>

                {/* Contact */}
                <Card className="card-interactive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Mail className="h-6 w-6 text-primary" />
                            Contact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6 text-base">
                            Have questions, feedback, or want to report an issue? Get in touch:
                        </p>
                        <div className="flex flex-wrap gap-4 mb-6">
                            <Button variant="outline" size="lg" asChild className="border-2 transition-all hover-lift">
                                <a href="mailto:your@email.com" className="flex items-center">
                                    <Mail className="h-5 w-5 mr-2" />
                                    your@email.com
                                </a>
                            </Button>
                            <Button variant="outline" size="lg" asChild className="border-2 transition-all hover-lift">
                                <a
                                    href="https://github.com/turtur0/events-aggregator"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <Github className="h-5 w-5 mr-2" />
                                    GitHub Repository
                                </a>
                            </Button>
                        </div>
                        <div className="p-5 rounded-xl border-2 bg-muted/30">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                <strong className="text-foreground">Venue owners or event organizers:</strong> If you'd like your events
                                removed from our aggregator, please contact us and we'll process your request within 48 hours.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageLayout>
    );
}
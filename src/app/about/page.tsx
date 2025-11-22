import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Shield, Clock, Mail, Github, Heart } from "lucide-react";

export const metadata = {
    title: "About | Melbourne Events",
    description: "Learn about Melbourne Events, our data sources, and ethical practices.",
};

export default function AboutPage() {
    return (
        <main className="container py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">About Melbourne Events</h1>
                    <p className="text-xl text-muted-foreground">
                        A comprehensive events aggregator built to help Melburnians discover
                        what's happening in their city.
                    </p>
                </div>

                {/* Mission */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            Our Mission
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert">
                        <p>
                            Melbourne is one of the world's most vibrant cities for live events,
                            but finding what's on can be frustrating. Event information is scattered
                            across multiple ticketing platforms, venue websites, and social media.
                        </p>
                        <p>
                            Melbourne Events solves this by aggregating events from multiple trusted
                            sources into one searchable, filterable platform. Whether you're looking
                            for a concert tonight or planning ahead for festival season, we've got you covered.
                        </p>
                    </CardContent>
                </Card>

                {/* Data Sources */}
                <Card className="mb-8" id="data-sources">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Data Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            We aggregate event data from the following trusted sources:
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                <Badge>Primary</Badge>
                                <div>
                                    <h4 className="font-semibold">Ticketmaster</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Major concerts, sports events, and theatre productions via their official Discovery API.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                <Badge variant="secondary">Secondary</Badge>
                                <div>
                                    <h4 className="font-semibold">Eventbrite</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Community events, workshops, and smaller venue shows via their official API.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                <Badge variant="outline">Venue</Badge>
                                <div>
                                    <h4 className="font-semibold">Arts Centre Melbourne</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Theatre, dance, and performing arts events from Melbourne's premier arts venue.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ethical Practices */}
                <Card className="mb-8" id="ethics">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-green-500" />
                            Ethical Data Practices
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            We take data ethics seriously. Here's how we operate responsibly:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className="text-green-500">✓</span>
                                <span><strong>API-first approach:</strong> We use official APIs wherever available.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-500">✓</span>
                                <span><strong>robots.txt compliance:</strong> We respect crawling restrictions.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-500">✓</span>
                                <span><strong>Rate limiting:</strong> We never overload source servers.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-500">✓</span>
                                <span><strong>Attribution:</strong> We always link back to the original ticketing source.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-500">✓</span>
                                <span><strong>No personal data:</strong> We only collect public event information.</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Update Frequency */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Update Frequency
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Our database is automatically updated daily via scheduled jobs. This ensures
                            you always see the latest events, accurate pricing, and up-to-date availability.
                        </p>
                    </CardContent>
                </Card>

                {/* Contact */}
                <Card id="contact">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Contact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Have questions, feedback, or want to report an issue? Get in touch:
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <a
                                href="mailto:your@email.com"
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <Mail className="h-4 w-4" />
                                your@email.com
                            </a>
                            <a
                                href="https://github.com/turtur0/events-aggregator"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <Github className="h-4 w-4" />
                                GitHub Repository
                            </a>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4">
                            <strong>Venue owners:</strong> If you'd like your events removed from our
                            aggregator, please contact us and we'll process your request within 48 hours.
                        </p>
                    </CardContent>
                </Card >
            </div >
        </main >
    );
}
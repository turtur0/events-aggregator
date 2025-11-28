import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t bg-muted/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-4 group">
                            <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm group-hover:scale-105 transition-transform">
                                ME
                            </span>
                            <span>Melbourne Events</span>
                        </Link>
                        <p className="text-muted-foreground text-sm max-w-md">
                            Your comprehensive guide to concerts, theatre, sports, and festivals in Melbourne.
                        </p>
                    </div>

                    {/* Browse */}
                    <div>
                        <h4 className="font-semibold mb-4 text-primary">Browse</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/events" className="hover:text-primary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">All Events</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/events?date=today" className="hover:text-primary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">Today</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/events?date=this-week" className="hover:text-primary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">This Week</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/events?free=true" className="hover:text-primary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">Free Events</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* About */}
                    <div>
                        <h4 className="font-semibold mb-4 text-secondary">About</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/about" className="hover:text-secondary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">About Us</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/about#data-sources" className="hover:text-secondary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">Data Sources</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/about#contact" className="hover:text-secondary transition-colors inline-flex items-center group">
                                    <span className="group-hover:translate-x-0.5 transition-transform">Contact</span>
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/turtur0/events-aggregator"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-secondary transition-colors inline-flex items-center gap-1 group"
                                >
                                    <span className="group-hover:translate-x-0.5 transition-transform">GitHub</span>
                                    <Github className="h-3 w-3 group-hover:rotate-12 transition-transform" />
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t mt-8 pt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Melbourne Events. Built by{" "}
                        <a
                            href="https://github.com/turtur0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-primary transition-colors font-medium"
                        >
                            turtur0
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
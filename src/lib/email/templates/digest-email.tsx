import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Button,
} from '@react-email/components';
import * as React from 'react';

interface Event {
    _id: string;
    title: string;
    startDate: string;
    venue: { name: string };
    priceMin?: number;
    priceMax?: number;
    isFree: boolean;
    imageUrl?: string;
    category: string;
}

interface DigestEmailProps {
    userName: string;
    keywordMatches: Event[];
    updatedFavourites: Event[];
    recommendations: { category: string; events: Event[] }[];
    unsubscribeUrl: string;
    preferencesUrl: string;
}

export default function DigestEmail({
    userName = 'there',
    keywordMatches = [],
    updatedFavourites = [],
    recommendations = [],
    unsubscribeUrl = '',
    preferencesUrl = '',
}: DigestEmailProps) {
    const hasContent = keywordMatches.length > 0 ||
        updatedFavourites.length > 0 ||
        recommendations.length > 0;

    const totalEvents = keywordMatches.length +
        updatedFavourites.length +
        recommendations.reduce((sum, cat) => sum + cat.events.length, 0);

    return (
        <Html>
            <Head />
            <Preview>
                {hasContent
                    ? `${totalEvents} curated events for you`
                    : 'Your event digest'}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Orange Primary Color */}
                    <Section style={header}>
                        <Heading style={h1}>Melbourne Events</Heading>
                        <Text style={headerSubtext}>Your Event Digest</Text>
                    </Section>

                    <Section style={section}>
                        <Text style={greeting}>Hi {userName},</Text>
                        {hasContent ? (
                            <Text style={intro}>
                                We've curated {totalEvents} events based on your preferences and interests.
                                Here's what's coming up.
                            </Text>
                        ) : (
                            <Text style={intro}>
                                We haven't found any new events matching your preferences.
                                Check back soon—we're always adding new events.
                            </Text>
                        )}
                    </Section>

                    {!hasContent ? (
                        <Section style={section}>
                            <Button style={button} href={preferencesUrl}>
                                Update Your Preferences
                            </Button>
                        </Section>
                    ) : (
                        <>
                            {keywordMatches.length > 0 && (
                                <>
                                    <Section style={section}>
                                        <Heading style={h2}>Events Matching Your Keywords</Heading>
                                        <Text style={sectionSubtext}>
                                            You asked to be notified about these
                                        </Text>
                                    </Section>
                                    {keywordMatches.map((event) => (
                                        <EventCard key={event._id} event={event} />
                                    ))}
                                    <Hr style={divider} />
                                </>
                            )}

                            {updatedFavourites.length > 0 && (
                                <>
                                    <Section style={section}>
                                        <Heading style={h2}>Updates to Your Saved Events</Heading>
                                        <Text style={sectionSubtext}>
                                            Changes to events you've favourited
                                        </Text>
                                    </Section>
                                    {updatedFavourites.map((event) => (
                                        <EventCard key={event._id} event={event} />
                                    ))}
                                    <Hr style={divider} />
                                </>
                            )}

                            {recommendations.map((categoryGroup, idx) => (
                                <React.Fragment key={categoryGroup.category}>
                                    <Section style={section}>
                                        <Heading style={h2}>
                                            {getCategoryLabel(categoryGroup.category)} Recommendations
                                        </Heading>
                                        <Text style={sectionSubtext}>
                                            Curated picks based on your interests
                                        </Text>
                                    </Section>
                                    {categoryGroup.events.map((event) => (
                                        <EventCard key={event._id} event={event} />
                                    ))}
                                    {idx < recommendations.length - 1 && <Hr style={divider} />}
                                </React.Fragment>
                            ))}
                        </>
                    )}

                    <Hr style={footerDivider} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            Want to customise what you receive?{' '}
                            <Link href={preferencesUrl} style={footerLink}>
                                Update your preferences
                            </Link>
                        </Text>
                        <Text style={footerText}>
                            <Link href={unsubscribeUrl} style={unsubscribeLink}>
                                Unsubscribe from emails
                            </Link>
                        </Text>
                        <Text style={footerCopyright}>
                            © {new Date().getFullYear()} Melbourne Events. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

function EventCard({ event }: { event: Event }) {
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${event._id}`;

    const date = new Date(event.startDate);
    const formattedDate = date.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    const getPriceDisplay = () => {
        if (event.isFree) return 'Free';

        if (event.priceMin !== undefined && event.priceMax !== undefined) {
            if (event.priceMin === event.priceMax) {
                return `$${event.priceMin.toFixed(2)}`;
            }
            return `$${event.priceMin.toFixed(2)} - $${event.priceMax.toFixed(2)}`;
        }

        if (event.priceMin !== undefined) {
            return `From $${event.priceMin.toFixed(2)}`;
        }

        return 'See website for pricing';
    };

    const hasValidImage = event.imageUrl &&
        event.imageUrl.startsWith('http') &&
        !event.imageUrl.includes('placeholder');

    return (
        <Section style={eventCard}>
            <table width="100%" cellPadding="0" cellSpacing="0">
                <tr>
                    {hasValidImage && (
                        <td style={eventImageCell}>
                            <Img
                                src={event.imageUrl}
                                width="100"
                                height="100"
                                alt={event.title}
                                style={eventImage}
                            />
                        </td>
                    )}
                    <td style={eventDetails}>
                        <Link href={eventUrl} style={eventTitle}>
                            {event.title}
                        </Link>
                        <Text style={eventMeta}>
                            <span style={metaLabel}>Date:</span> {formattedDate} at {formattedTime}
                        </Text>
                        <Text style={eventMeta}>
                            <span style={metaLabel}>Venue:</span> {event.venue.name}
                        </Text>
                        <Text style={eventMeta}>
                            <span style={metaLabel}>Price:</span> {getPriceDisplay()}
                        </Text>
                        <Button style={eventButton} href={eventUrl}>
                            View Details
                        </Button>
                    </td>
                </tr>
            </table>
        </Section>
    );
}

function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        music: 'Music',
        theatre: 'Theatre',
        sports: 'Sports',
        arts: 'Arts & Culture',
        family: 'Family',
        other: 'Other',
    };
    return labels[category.toLowerCase()] || category;
}

// Styled with site colors matching the Melbourne Events design system
const main = {
    backgroundColor: '#f5f5f5',
    fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    marginBottom: '40px',
    maxWidth: '600px',
    borderRadius: '12px',
    overflow: 'hidden' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
};

// Primary orange color from site theme
const header = {
    backgroundColor: '#ea580c',
    padding: '40px 24px',
    textAlign: 'center' as const,
};

const h1 = {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
};

const headerSubtext = {
    color: '#fed7aa',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
};

const section = {
    padding: '28px 24px 0 24px',
};

const greeting = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a0a0a',
    margin: '0 0 12px 0',
};

const intro = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#525252',
    margin: '0',
};

const h2 = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0a0a0a',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
    paddingLeft: '12px',
    borderLeft: '4px solid #14b8a6',
};

const sectionSubtext = {
    fontSize: '14px',
    color: '#14b8a6',
    margin: '0 0 20px 0',
    fontWeight: '600',
};

const eventCard = {
    backgroundColor: '#fafafa',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    margin: '0 24px 16px 24px',
    padding: '20px',
    transition: 'all 0.3s ease',
    borderTop: '3px solid #14b8a6',
};

const eventImageCell = {
    width: '100px',
    verticalAlign: 'top' as const,
    paddingRight: '16px',
};

const eventImage = {
    borderRadius: '8px',
    objectFit: 'cover' as const,
    display: 'block',
    border: '2px solid #e5e5e5',
};

const eventDetails = {
    verticalAlign: 'top' as const,
};

const eventTitle = {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0a0a0a',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '10px',
    lineHeight: '24px',
};

const eventMeta = {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#525252',
    margin: '6px 0',
};

const metaLabel = {
    fontWeight: '600',
    color: '#737373',
};

const eventButton = {
    backgroundColor: '#14b8a6',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    marginTop: '14px',
    border: 'none',
    cursor: 'pointer',
};

const button = {
    backgroundColor: '#ea580c',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
    marginTop: '12px',
};

const divider = {
    borderColor: '#e5e5e5',
    margin: '28px 24px',
};

const footerDivider = {
    borderColor: '#e5e5e5',
    margin: '40px 24px 28px 24px',
};

const footer = {
    padding: '0 24px 36px 24px',
};

const footerText = {
    fontSize: '13px',
    lineHeight: '22px',
    color: '#737373',
    margin: '8px 0',
    textAlign: 'center' as const,
};

const footerLink = {
    color: '#ea580c',
    textDecoration: 'underline',
    fontWeight: '600',
};

const unsubscribeLink = {
    color: '#a3a3a3',
    textDecoration: 'underline',
    fontWeight: '500',
};

const footerCopyright = {
    fontSize: '12px',
    color: '#a3a3a3',
    margin: '20px 0 0 0',
    textAlign: 'center' as const,
    fontWeight: '500',
};
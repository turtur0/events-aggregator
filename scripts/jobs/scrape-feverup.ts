import { scrapeFeverUpMelbourne } from '@/lib/scrapers/feverup';

/**
 * Tests FeverUp scraper and logs results without saving to database.
 */
async function testFeverUpScraper() {
    console.log('═'.repeat(70));
    console.log('FeverUp Scraper Test');
    console.log('═'.repeat(70));
    console.log('Testing scraper without database writes\n');

    try {
        const startTime = Date.now();

        // Test with limited events
        const events = await scrapeFeverUpMelbourne({
            maxEvents: 10,
            fetchDetails: true,
            detailFetchDelay: 1500,
        });

        const duration = Date.now() - startTime;

        console.log('\n' + '═'.repeat(70));
        console.log('Scrape Results');
        console.log('═'.repeat(70));
        console.log(`Total events scraped: ${events.length}`);
        console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
        console.log(`Average time per event: ${(duration / events.length / 1000).toFixed(1)}s\n`);

        // Display sample events
        if (events.length > 0) {
            console.log('Sample Events:');
            console.log('─'.repeat(70));

            events.slice(0, 3).forEach((event, i) => {
                console.log(`\n${i + 1}. ${event.title}`);
                console.log(`   Category: ${event.category}`);
                console.log(`   Venue: ${event.venue.name}`);
                console.log(`   Suburb: ${event.venue.suburb}`);
                console.log(`   Start Date: ${event.startDate.toLocaleDateString()}`);
                console.log(`   Price: ${event.isFree ? 'Free' : `$${event.priceMin}${event.priceMax ? ` - $${event.priceMax}` : ''}`}`);
                console.log(`   URL: ${event.bookingUrl}`);
                console.log(`   Description: ${event.description.substring(0, 100)}...`);
            });

            // Category breakdown
            console.log('\n' + '─'.repeat(70));
            console.log('Category Breakdown:');
            const categoryCount: Record<string, number> = {};
            events.forEach(event => {
                categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
            });
            Object.entries(categoryCount).forEach(([category, count]) => {
                console.log(`   ${category}: ${count}`);
            });

            // Price analysis
            console.log('\n' + '─'.repeat(70));
            console.log('Price Analysis:');
            const freeEvents = events.filter(e => e.isFree).length;
            const paidEvents = events.filter(e => !e.isFree).length;
            const prices = events.filter(e => e.priceMin).map(e => e.priceMin!);
            console.log(`   Free events: ${freeEvents}`);
            console.log(`   Paid events: ${paidEvents}`);
            if (prices.length > 0) {
                console.log(`   Price range: $${Math.min(...prices)} - $${Math.max(...prices)}`);
                console.log(`   Average price: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`);
            }

            // Venue analysis
            console.log('\n' + '─'.repeat(70));
            console.log('Venue Analysis:');
            const venues = new Set(events.map(e => e.venue.name));
            const suburbs = new Set(events.map(e => e.venue.suburb));
            console.log(`   Unique venues: ${venues.size}`);
            console.log(`   Unique suburbs: ${suburbs.size}`);
            console.log(`   Top suburbs: ${Array.from(suburbs).slice(0, 5).join(', ')}`);
        }

        console.log('\n' + '═'.repeat(70));
        console.log('Test completed successfully!');
        console.log('═'.repeat(70) + '\n');

    } catch (error) {
        console.error('\nTest failed:', error);
        process.exit(1);
    }
}

// Run test
if (require.main === module) {
    testFeverUpScraper()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}
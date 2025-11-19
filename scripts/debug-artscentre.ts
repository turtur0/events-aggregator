import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debugArtsCentrePuppeteer() {
    let browser;
    try {
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: false, // Watch it happen
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        // ============================================
        // PART 1: Debug Category Page
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('PART 1: DEBUGGING CATEGORY PAGE');
        console.log('='.repeat(60));

        const categoryPage = await browser.newPage();
        await categoryPage.setViewport({ width: 1920, height: 1080 });
        await categoryPage.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        console.log('🔍 Navigating to Classical Music category...');
        await categoryPage.goto('https://www.artscentremelbourne.com.au/whats-on/classical-music', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('⏳ Waiting for React to load (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Screenshot
        await categoryPage.screenshot({ path: 'debug-category.png', fullPage: true });
        console.log('📸 Screenshot saved: debug-category.png');

        // CRITICAL: Find ALL links that point to event pages
        console.log('\n🔗 Finding all event links on category page:');
        const eventLinks = await categoryPage.evaluate(() => {
            const links = document.querySelectorAll('a[href*="/whats-on/"]');
            const results: any[] = [];
            
            links.forEach((link) => {
                const href = (link as HTMLAnchorElement).href;
                // Event URLs have pattern: /whats-on/YEAR/category/event-name
                if (/\/whats-on\/\d{4}\//.test(href)) {
                    results.push({
                        text: link.textContent?.trim() || '',
                        href: href,
                        innerHTML: link.innerHTML.substring(0, 200),
                        parentClass: (link.parentElement as HTMLElement)?.className || '',
                        parentTag: link.parentElement?.tagName || '',
                    });
                }
            });
            
            return results;
        });

        console.log(`   Found ${eventLinks.length} event links`);
        eventLinks.slice(0, 5).forEach((link, i) => {
            console.log(`\n   ${i + 1}. "${link.text}"`);
            console.log(`      URL: ${link.href}`);
            console.log(`      Parent: <${link.parentTag}> class="${link.parentClass}"`);
        });

        // Find the PARENT container of these links
        console.log('\n🔍 Analyzing parent structure of event links:');
        const parentAnalysis = await categoryPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/whats-on/"]'))
                .filter(link => /\/whats-on\/\d{4}\//.test((link as HTMLAnchorElement).href));
            
            if (links.length === 0) return null;
            
            // Get first event link's ancestors
            const firstLink = links[0];
            const ancestors: any[] = [];
            let current = firstLink.parentElement;
            
            for (let i = 0; i < 10 && current; i++) {
                ancestors.push({
                    level: i,
                    tag: current.tagName,
                    className: current.className,
                    id: current.id,
                    childCount: current.children.length,
                    hasMultipleEventLinks: Array.from(current.querySelectorAll('a[href*="/whats-on/"]'))
                        .filter(l => /\/whats-on\/\d{4}\//.test((l as HTMLAnchorElement).href)).length > 1
                });
                current = current.parentElement;
            }
            
            return ancestors;
        });

        if (parentAnalysis) {
            console.log('\n   Parent hierarchy (from link upward):');
            parentAnalysis.forEach((ancestor: any) => {
                const indicator = ancestor.hasMultipleEventLinks ? ' ← LIKELY EVENT CONTAINER' : '';
                console.log(`   ${' '.repeat(ancestor.level * 2)}Level ${ancestor.level}: <${ancestor.tag}> ` +
                    `class="${ancestor.className}" id="${ancestor.id}" ` +
                    `(${ancestor.childCount} children)${indicator}`);
            });
        }

        // Test the selector from your code
        console.log('\n🧪 Testing your current selector ".event-tile":');
        const eventTileCount = await categoryPage.evaluate(() => {
            return document.querySelectorAll('.event-tile').length;
        });
        console.log(`   Result: ${eventTileCount} elements found`);

        // Search for event-related classes
        console.log('\n🏷️  All classes containing "event", "card", "tile", "item":');
        const relevantClasses = await categoryPage.evaluate(() => {
            const classes = new Set<string>();
            document.querySelectorAll('[class]').forEach(el => {
                const classList = el.className;
                if (typeof classList === 'string') {
                    classList.split(' ').forEach(cls => {
                        const lower = cls.toLowerCase();
                        if (lower.includes('event') || lower.includes('card') || 
                            lower.includes('tile') || lower.includes('item') ||
                            lower.includes('grid') || lower.includes('list')) {
                            classes.add(cls);
                        }
                    });
                }
            });
            return Array.from(classes).sort();
        });
        relevantClasses.forEach(cls => console.log(`   ${cls}`));

        // Try to find the actual event container pattern
        console.log('\n🎯 Searching for the correct event container selector:');
        const containerTests = [
            'article',
            'div[class*="card"]',
            'div[class*="Card"]',
            'div[class*="item"]',
            'div[class*="Item"]',
            'li',
            '[class*="event"]',
            '[class*="Event"]',
            // Common React patterns
            'div[class*="sc-"]', // styled-components
            'div[data-testid]',
        ];

        for (const selector of containerTests) {
            const result = await categoryPage.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                let withEventLinks = 0;
                
                elements.forEach(el => {
                    const links = el.querySelectorAll('a[href*="/whats-on/"]');
                    const hasEventLink = Array.from(links).some(link => 
                        /\/whats-on\/\d{4}\//.test((link as HTMLAnchorElement).href)
                    );
                    if (hasEventLink) withEventLinks++;
                });
                
                return { total: elements.length, withEventLinks };
            }, selector);
            
            if (result.withEventLinks > 0) {
                console.log(`   ✓ ${selector}: ${result.withEventLinks}/${result.total} contain event links`);
            }
        }

        // Get the actual HTML structure of first event
        console.log('\n📦 HTML structure of first event:');
        const firstEventHTML = await categoryPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/whats-on/"]'))
                .filter(link => /\/whats-on\/\d{4}\//.test((link as HTMLAnchorElement).href));
            
            if (links.length === 0) return null;
            
            // Get the container that likely wraps the event
            let container = links[0].parentElement;
            // Go up a few levels to get the full event card
            for (let i = 0; i < 3; i++) {
                if (container?.parentElement) container = container.parentElement;
            }
            
            return container?.outerHTML.substring(0, 1000);
        });
        
        if (firstEventHTML) {
            console.log(firstEventHTML);
        }

        // Save HTML for inspection
        const categoryHtml = await categoryPage.content();
        fs.writeFileSync('debug-category.html', categoryHtml);
        console.log('\n✅ Full HTML saved to: debug-category.html');
        console.log('   Open this file and search for event URLs to see the actual structure');

        await categoryPage.close();

        console.log('\n\n' + '='.repeat(60));
        console.log('✅ DEBUG COMPLETE');
        console.log('='.repeat(60));
        console.log('\n📋 SUMMARY:');
        console.log(`   - Found ${eventLinks.length} event links on category page`);
        console.log(`   - Your selector ".event-tile" found: ${eventTileCount} elements`);
        console.log('\n📝 NEXT STEPS:');
        console.log('   1. Check debug-category.png to see the page visually');
        console.log('   2. Open debug-category.html and search for event URLs');
        console.log('   3. Look at the HTML structure around those URLs');
        console.log('   4. Find the correct parent container class/selector');
        console.log('   5. Update your scraper with the correct selector');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

debugArtsCentrePuppeteer();
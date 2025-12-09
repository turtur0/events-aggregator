// ============================================
// test-feverup-hybrid.ts
// Tests if Puppeteer + Cheerio hybrid approach is viable for FeverUp
// Usage: tsx scripts/dev/test-feverup-hybrid.ts
// ============================================

import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import fs from 'fs';

interface HybridTestResult {
  timestamp: string;
  listingPage: {
    url: string;
    requiresJavaScript: boolean;
    staticEventCount: number;
    dynamicEventCount: number;
    actualEventCount: number;
    recommendation: string;
    sampleCards: any[];
    suggestedSelectors: {
      cardContainer: string;
      title: string;
      price: string;
      date: string;
      link: string;
      image: string;
    };
  };
  sampleEventPages: Array<{
    url: string;
    requiresJavaScript: boolean;
    staticContentQuality: 'excellent' | 'good' | 'poor' | 'none';
    extractedData: {
      title?: string;
      description?: string;
      date?: string;
      price?: string;
      venue?: string;
      category?: string;
      imageUrl?: string;
    };
    structuredData?: any;
    selectors: {
      title: string[];
      description: string[];
      date: string[];
      price: string[];
      venue: string[];
      category: string[];
      image: string[];
    };
    recommendation: string;
  }>;
  overallRecommendation: string;
  estimatedLoadTime: {
    puppeteerListing: number;
    cheerioDetailAvg: number;
    totalFor50Events: number;
  };
}

/**
 * Test listing page with both static HTML and Puppeteer
 */
async function testListingPage(url: string): Promise<any> {
  console.log('\n📄 TESTING LISTING PAGE');
  console.log('═'.repeat(70));
  
  // Test 1: Static HTML (no JavaScript)
  console.log('\n1️⃣  Testing static HTML (Cheerio only)...');
  const staticStart = Date.now();
  const staticResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  const staticHtml = await staticResponse.text();
  const $static = load(staticHtml);
  const staticEventCount = $static('[class*="card"]').length;
  const staticTime = Date.now() - staticStart;
  
  console.log(`   ⏱️  Time: ${staticTime}ms`);
  console.log(`   📊 Event cards found: ${staticEventCount}`);

  // Test 2: With JavaScript (Puppeteer)
  console.log('\n2️⃣  Testing with JavaScript (Puppeteer)...');
  const dynamicStart = Date.now();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for cards to load
  await page.waitForSelector('[class*="card"]', { timeout: 10000 }).catch(() => {});
  
  // Scroll to load lazy-loaded content
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const dynamicHtml = await page.content();
  const $dynamic = load(dynamicHtml);
  const dynamicEventCount = $dynamic('[class*="card"]').length;
  const dynamicTime = Date.now() - dynamicStart;
  
  console.log(`   ⏱️  Time: ${dynamicTime}ms`);
  console.log(`   📊 Event cards found: ${dynamicEventCount}`);

  // Extract event URLs (filter out gift cards)
  const eventUrls: string[] = [];
  const cardData: any[] = [];
  
  $dynamic('[class*="card"]').each((_, card) => {
    const $card = $dynamic(card);
    const title = $card.find('[class*="title"]').first().text().trim();
    const href = $card.find('a[href*="/m/"]').attr('href');
    const price = $card.find('[class*="price"]').first().text().trim();
    const date = $card.find('[class*="date"]').first().text().trim();
    
    // Skip gift cards
    const isGiftCard = title.toLowerCase().includes('gift card') || 
                       title.toLowerCase().includes('giftcard');
    
    if (href && !isGiftCard && !eventUrls.includes(href)) {
      const fullUrl = href.startsWith('http') ? href : `https://feverup.com${href}`;
      eventUrls.push(fullUrl);
      cardData.push({ title, price, date, url: fullUrl });
    }
  });

  console.log(`\n📋 Sample Events Found:`);
  cardData.slice(0, 5).forEach((card, i) => {
    console.log(`   ${i + 1}. ${card.title}`);
    console.log(`      Price: ${card.price || 'N/A'} | Date: ${card.date || 'N/A'}`);
  });

  // Analyse selectors used in the listing page
  console.log('\n🔍 Suggested Selectors for Listing Page:');
  const suggestedSelectors = {
    cardContainer: '[class*="card"]',
    title: $dynamic('[class*="card"] [class*="title"]').length > 0 ? '[class*="title"]' : 'h3, h2',
    price: '[class*="price"]',
    date: '[class*="date"]',
    link: 'a[href*="/m/"]',
    image: 'img',
  };
  console.log(JSON.stringify(suggestedSelectors, null, 2));

  await browser.close();

  // Analysis
  const requiresJS = staticEventCount < 5;
  const recommendation = requiresJS
    ? '✅ USE PUPPETEER - Dynamic content requires JavaScript'
    : '✅ USE CHEERIO - Static HTML has sufficient content';

  console.log(`\n📋 Analysis:`);
  console.log(`   Static vs Dynamic: ${staticEventCount} vs ${dynamicEventCount} events`);
  console.log(`   Requires JavaScript: ${requiresJS ? 'YES' : 'NO'}`);
  console.log(`   ${recommendation}`);

  return {
    requiresJavaScript: requiresJS,
    staticEventCount,
    dynamicEventCount,
    actualEventCount: eventUrls.length,
    recommendation,
    puppeteerTime: dynamicTime,
    eventUrls,
    sampleCards: cardData.slice(0, 5),
    suggestedSelectors,
  };
}

/**
 * Test individual event page with Cheerio
 */
async function testEventPage(url: string): Promise<any> {
  console.log('\n\n🎫 TESTING INDIVIDUAL EVENT PAGE');
  console.log('═'.repeat(70));
  console.log(`URL: ${url}\n`);

  const start = Date.now();
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  const html = await response.text();
  const $ = load(html);
  const loadTime = Date.now() - start;

  console.log(`⏱️  Load time: ${loadTime}ms\n`);

  // Try to extract key information
  const extractedData: any = {};

  // Title
  const titleSelectors = [
    'h1',
    '[class*="title"]',
    '[property="og:title"]',
    'meta[property="og:title"]',
  ];
  for (const sel of titleSelectors) {
    const title = sel.startsWith('meta')
      ? $(sel).attr('content')
      : $(sel).first().text().trim();
    if (title && title.length > 3) {
      extractedData.title = title;
      break;
    }
  }

  // Description
  const descSelectors = [
    '[class*="description"]',
    '[property="og:description"]',
    'meta[property="og:description"]',
    'p',
  ];
  for (const sel of descSelectors) {
    const desc = sel.startsWith('meta')
      ? $(sel).attr('content')
      : $(sel).first().text().trim();
    if (desc && desc.length > 20) {
      extractedData.description = desc.substring(0, 150);
      break;
    }
  }

  // Date
  extractedData.date = $('time[datetime]').attr('datetime') ||
    $('[class*="date"]').first().text().trim() ||
    'Not found';

  // Price
  extractedData.price = $('[class*="price"]').first().text().trim() || 'Not found';

  // Venue
  extractedData.venue = $('[class*="venue"], [class*="location"]').first().text().trim() || 'Not found';

  // Category
  extractedData.category = $('[class*="category"], [class*="tag"]').first().text().trim() || 'Not found';

  // Check for structured data
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
  let structuredDataType = null;
  let structuredData = null;
  if (hasStructuredData) {
    try {
      const jsonLd = JSON.parse($('script[type="application/ld+json"]').first().html() || '{}');
      structuredDataType = jsonLd['@type'];
      structuredData = jsonLd;
    } catch (e) {
      // Ignore
    }
  }

  // Quality assessment
  const hasTitle = !!extractedData.title;
  const hasDescription = extractedData.description && extractedData.description !== 'Not found';
  const hasPrice = extractedData.price !== 'Not found';
  const hasDate = extractedData.date !== 'Not found';

  const foundFields = [hasTitle, hasDescription, hasPrice, hasDate].filter(Boolean).length;
  
  let quality: 'excellent' | 'good' | 'poor' | 'none' = 'none';
  if (foundFields >= 4) quality = 'excellent';
  else if (foundFields >= 3) quality = 'good';
  else if (foundFields >= 1) quality = 'poor';

  const requiresJS = !hasTitle || foundFields < 2;
  const recommendation = requiresJS
    ? '❌ NEEDS PUPPETEER - Insufficient static content'
    : '✅ USE CHEERIO - Good static content quality';

  // Print results
  console.log('📊 Extracted Data:');
  console.log(`   Title:        ${extractedData.title || '❌ Not found'}`);
  console.log(`   Description:  ${extractedData.description ? '✅ Found' : '❌ Not found'}`);
  console.log(`   Date:         ${extractedData.date}`);
  console.log(`   Price:        ${extractedData.price}`);
  console.log(`   Venue:        ${extractedData.venue}`);
  console.log(`   Category:     ${extractedData.category}`);
  console.log(`   Structured:   ${hasStructuredData ? `✅ ${structuredDataType}` : '❌ None'}`);
  
  if (structuredData) {
    console.log('\n📦 Structured Data Sample:');
    console.log(JSON.stringify(structuredData, null, 2).substring(0, 500));
  }
  console.log(`\n📋 Analysis:`);
  console.log(`   Content Quality: ${quality.toUpperCase()}`);
  console.log(`   Found ${foundFields}/4 key fields`);
  console.log(`   ${recommendation}`);

  return {
    requiresJavaScript: requiresJS,
    staticContentQuality: quality,
    extractedData,
    recommendation,
    loadTime,
    hasStructuredData,
    structuredDataType,
    structuredData,
  };
}

/**
 * Main test function
 */
async function testHybridApproach(): Promise<void> {
  const listingUrl = 'https://feverup.com/en/melbourne/things-to-do';
  
  console.log('═'.repeat(70));
  console.log('🔬 FEVERUP HYBRID SCRAPING VIABILITY TEST');
  console.log('═'.repeat(70));
  console.log('Testing: Puppeteer (listing) + Cheerio (details)');
  console.log('═'.repeat(70));

  try {
    // Test listing page
    const listingResults = await testListingPage(listingUrl);

    // Get sample event URLs (first 5)
    const sampleEventUrls = listingResults.eventUrls.slice(0, 5);

    console.log(`\n\n🔬 Testing ${sampleEventUrls.length} sample event pages...`);

    // Test all 5 event pages
    const eventResults = [];
    for (let i = 0; i < sampleEventUrls.length; i++) {
      const result = await testEventPage(sampleEventUrls[i], i);
      eventResults.push(result);
      
      // Add small delay between requests
      if (i < sampleEventUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate average load time
    const avgCheerioTime = eventResults.reduce((sum, r) => sum + r.loadTime, 0) / eventResults.length;
    const puppeteerTime = listingResults.puppeteerTime;
    const totalFor50Events = puppeteerTime + (avgCheerioTime * 50);

    // Overall recommendation
    const allEventsPagesGood = eventResults.every(r => !r.requiresJavaScript);
    
    let overallRecommendation = '';
    if (!listingResults.requiresJavaScript && allEventsPagesGood) {
      overallRecommendation = '🎯 BEST: Use Cheerio for both (fast & efficient)';
    } else if (listingResults.requiresJavaScript && allEventsPagesGood) {
      overallRecommendation = '✅ VIABLE: Puppeteer (listing) + Cheerio (details) - Good balance';
    } else if (listingResults.requiresJavaScript && !allEventsPagesGood) {
      overallRecommendation = '⚠️  SLOW: Both need Puppeteer - Consider alternatives';
    } else {
      overallRecommendation = '❓ UNUSUAL: Static listing but dynamic details';
    }

    // Print summary
    console.log('\n\n═'.repeat(70));
    console.log('📊 FINAL VERDICT');
    console.log('═'.repeat(70));
    console.log(`\n${overallRecommendation}\n`);
    console.log('Performance Estimates:');
    console.log(`   Puppeteer (listing):     ${puppeteerTime}ms`);
    console.log(`   Cheerio (per event avg): ${Math.round(avgCheerioTime)}ms`);
    console.log(`   Total for 50 events:     ${(totalFor50Events / 1000).toFixed(1)}s`);
    console.log('\nData Quality:');
    console.log(`   Total cards found:       ${listingResults.dynamicEventCount}`);
    console.log(`   Actual events:           ${listingResults.actualEventCount} (gift cards filtered)`);
    console.log(`   Event pages tested:      ${eventResults.length}`);
    console.log(`   Avg quality:             ${eventResults[0]?.staticContentQuality?.toUpperCase() || 'N/A'}`);
    console.log(`   All have structured data: ${eventResults.every(r => r.hasStructuredData) ? 'YES' : 'NO'}`);
    console.log('═'.repeat(70));

    // Save detailed report
    const report: HybridTestResult = {
      timestamp: new Date().toISOString(),
      listingPage: {
        url: listingUrl,
        requiresJavaScript: listingResults.requiresJavaScript,
        staticEventCount: listingResults.staticEventCount,
        dynamicEventCount: listingResults.dynamicEventCount,
        actualEventCount: listingResults.actualEventCount,
        recommendation: listingResults.recommendation,
        sampleCards: listingResults.sampleCards,
        suggestedSelectors: listingResults.suggestedSelectors,
      },
      sampleEventPages: eventResults.map((r, i) => ({
        url: sampleEventUrls[i],
        requiresJavaScript: r.requiresJavaScript,
        staticContentQuality: r.staticContentQuality,
        extractedData: r.extractedData,
        structuredData: r.structuredData,
        selectors: r.selectors,
        recommendation: r.recommendation,
      })),
      overallRecommendation,
      estimatedLoadTime: {
        puppeteerListing: puppeteerTime,
        cheerioDetailAvg: Math.round(avgCheerioTime),
        totalFor50Events: Math.round(totalFor50Events),
      },
    };

    fs.writeFileSync('feverup-hybrid-test.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to: feverup-hybrid-test.json\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testHybridApproach().catch(console.error);
}
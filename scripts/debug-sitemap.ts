// debugPage.ts
import puppeteer from 'puppeteer';
import fs from 'fs';

interface PageDebugInfo {
  url: string;
  title: string;
  domSnapshot: string;
  innerTextSnapshot: string;
  networkRequests: string[];
}

/**
 * Debugs a webpage by capturing DOM, inner text, and network requests
 * @param url The URL of the page to debug
 */
async function debugPage(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const networkRequests: string[] = [];
  page.on('request', (request) => {
    networkRequests.push(request.url());
  });

  await page.goto(url, { waitUntil: 'networkidle2' });

  const domSnapshot = await page.content(); // Full HTML
  const innerTextSnapshot = await page.evaluate(() => document.body.innerText);

  const debugInfo: PageDebugInfo = {
    url,
    title: await page.title(),
    domSnapshot,
    innerTextSnapshot,
    networkRequests,
  };

  // Save snapshot to file for inspection
  fs.writeFileSync('pageDebug.json', JSON.stringify(debugInfo, null, 2));

  console.log(`Debug info saved to pageDebug.json for ${url}`);
  await browser.close();
}

// Example usage
const url = process.argv[2]; // Run: ts-node debugPage.ts "https://example.com"
if (!url) {
  console.error('Please provide a URL as an argument.');
  process.exit(1);
}

debugPage(url).catch(console.error);

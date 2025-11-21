/**
 * Arts Centre Melbourne Scraper – Debug Sitemap
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import underlying Puppeteer types explicitly
import type { Page, HTTPResponse } from 'puppeteer';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

puppeteer.use(StealthPlugin());

const SITEMAP_URL = 'https://www.artscentremelbourne.com.au/sitemap.xml';

async function main() {
    console.log('🌐 Arts Centre Melbourne Sitemap Debugger');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    try {
        const page = await browser.newPage();
        await setupStealthPage(page);

        await debugSitemapFetch(page, SITEMAP_URL);
    } finally {
        await browser.close();
        console.log('🌐 Browser closed');
    }
}

async function setupStealthPage(page: Page) {
    await page.setViewport({ width: 1920, height: 1080 });

    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-AU,en;q=0.9' });

    // Block heavy resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const blocked = ['image', 'stylesheet', 'font', 'media'];
        blocked.includes(req.resourceType()) ? req.abort() : req.continue();
    });

    // Anti-detection tweaks
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
        // @ts-ignore
        if (!(window as any).chrome) (window as any).chrome = { runtime: {} };
    });
}

async function debugSitemapFetch(page: Page, url: string) {
    console.log('\n🔎 Running sitemap debugger...\n');

    let mainResponse: HTTPResponse | null = null;
    page.on('response', (response: HTTPResponse) => {
        const reqUrl = response.url().split('#')[0];
        const tgtUrl = url.split('#')[0];
        if (!mainResponse && reqUrl === tgtUrl) {
            mainResponse = response;
        }
    });

    const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
    });

    const finalUrl = page.url();
    const status = response?.status();
    const headers = response?.headers();

    console.log(`➡️ Final URL: ${finalUrl}`);
    console.log(`➡️ HTTP Status: ${status}`);
    console.log(`➡️ Content-Type: ${headers?.['content-type']}`);
    console.log(`➡️ Response Headers:`);
    console.log(headers);

    const raw = await page.evaluate(() => document.documentElement.outerHTML);

    console.log('\n📄 First 2000 characters of sitemap response:');
    console.log(raw.substring(0, 2000));

    fs.writeFileSync('debug-sitemap.html', raw);
    console.log('\n💾 Saved raw sitemap content → debug-sitemap.html');

    console.log('\n🔍 Debugger complete.\n');
}

main();

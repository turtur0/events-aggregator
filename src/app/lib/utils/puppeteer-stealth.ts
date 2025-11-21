/**
 * Puppeteer Stealth Configuration
 * Makes the browser appear more human-like to avoid detection
 * 
 * Install: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export interface BrowserConfig {
    headless?: boolean;
    slowMo?: number;  // Slow down actions (ms)
}

/**
 * Launch a stealth browser that's harder to detect
 */
export async function launchStealthBrowser(config: BrowserConfig = {}): Promise<Browser> {
    const browser = await puppeteer.launch({
        headless: config.headless ?? true,
        slowMo: config.slowMo ?? 50,  // Slight delay makes it more human-like
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--window-size=1920,1080',
            '--start-maximized',
            // Use a random timezone
            `--timezone=${getRandomTimezone()}`,
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    return browser;
}

/**
 * Configure a page with stealth settings
 */
export async function configureStealthPage(page: Page): Promise<void> {
    // Set realistic viewport
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false,
    });

    // Set realistic user agent
    await page.setUserAgent(getRandomUserAgent());

    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    });

    // Override navigator properties to avoid detection
    await page.evaluateOnNewDocument(() => {
        // Override webdriver flag
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' },
            ],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-AU', 'en'],
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
            parameters.name === 'notifications'
                ? Promise.resolve({ state: 'denied' } as PermissionStatus)
                : originalQuery(parameters)
        );

        // Add chrome object if missing
        // @ts-ignore - chrome doesn't exist in standard Window type
        if (!(window as any).chrome) {
            (window as any).chrome = { runtime: {} };
        }
    });
}

/**
 * Simulate human-like mouse movement to a target element
 */
export async function humanMove(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) return;

    const box = await element.boundingBox();
    if (!box) return;

    // Get current mouse position (or use center of screen)
    const currentX = 960;
    const currentY = 540;

    // Target is center of element with slight randomness
    const targetX = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const targetY = box.y + box.height / 2 + (Math.random() * 10 - 5);

    // Move in steps with bezier-like curve
    const steps = 20 + Math.floor(Math.random() * 10);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Ease-out cubic for more natural movement
        const ease = 1 - Math.pow(1 - t, 3);

        const x = currentX + (targetX - currentX) * ease + (Math.random() * 2 - 1);
        const y = currentY + (targetY - currentY) * ease + (Math.random() * 2 - 1);

        await page.mouse.move(x, y);
        await delay(10 + Math.random() * 20);
    }
}

/**
 * Human-like typing with variable delays
 */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
    await humanMove(page, selector);
    await page.click(selector);
    await delay(100 + Math.random() * 200);

    for (const char of text) {
        await page.keyboard.type(char);
        // Variable delay between keystrokes
        await delay(50 + Math.random() * 150);

        // Occasional longer pause (simulating thinking)
        if (Math.random() < 0.05) {
            await delay(200 + Math.random() * 300);
        }
    }
}

/**
 * Human-like click with movement
 */
export async function humanClick(page: Page, selector: string): Promise<void> {
    await humanMove(page, selector);
    await delay(50 + Math.random() * 100);
    await page.click(selector);
}

/**
 * Scroll the page in a human-like manner
 */
export async function humanScroll(page: Page, distance: number = 300): Promise<void> {
    const steps = 5 + Math.floor(Math.random() * 5);
    const stepDistance = distance / steps;

    for (let i = 0; i < steps; i++) {
        await page.evaluate((d) => {
            window.scrollBy(0, d);
        }, stepDistance + (Math.random() * 20 - 10));
        await delay(50 + Math.random() * 100);
    }
}

// Helper functions
function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

function getRandomUserAgent(): string {
    const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomTimezone(): string {
    const timezones = [
        'Australia/Melbourne',
        'Australia/Sydney',
        'Australia/Brisbane',
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
}

/**
 * Export a configured browser launcher for the main scraper
 */
export async function createStealthSession(): Promise<{ browser: Browser; page: Page }> {
    const browser = await launchStealthBrowser();
    const page = await browser.newPage();
    await configureStealthPage(page);

    return { browser, page };
}
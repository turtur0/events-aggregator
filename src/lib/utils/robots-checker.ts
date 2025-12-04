/**
 * Simple robots.txt compliance checker for web scraping.
 * Checks if a path is allowed to be scraped according to robots.txt rules.
 */

interface RobotsCache {
    [baseUrl: string]: {
        disallowedPaths: string[];
        fetchedAt: number;
    };
}

const cache: RobotsCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks if scraping is allowed for a given URL according to robots.txt.
 * Returns true if allowed, false if disallowed.
 * Defaults to allowing scraping if robots.txt cannot be fetched or parsed.
 */
export async function canScrape(url: string): Promise<boolean> {
    try {
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        const path = urlObj.pathname;

        // Check cache first
        const cached = cache[baseUrl];
        if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
            return !isPathDisallowed(path, cached.disallowedPaths);
        }

        // Fetch and parse robots.txt
        const robotsUrl = `${baseUrl}/robots.txt`;
        const response = await fetch(robotsUrl, {
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            // No robots.txt or error fetching - allow scraping
            return true;
        }

        const text = await response.text();
        const disallowedPaths = parseRobotsTxt(text);

        // Cache the result
        cache[baseUrl] = {
            disallowedPaths,
            fetchedAt: Date.now(),
        };

        return !isPathDisallowed(path, disallowedPaths);
    } catch (error) {
        // On any error, default to allowing scraping
        console.warn(`[Robots] Error checking robots.txt: ${error}`);
        return true;
    }
}

/**
 * Parses robots.txt content and extracts disallowed paths for all user agents.
 */
function parseRobotsTxt(content: string): string[] {
    const lines = content.split('\n');
    const disallowedPaths: string[] = [];
    let isRelevantSection = false;

    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();

        // Check if this section applies to all user agents or our bot
        if (trimmed.startsWith('user-agent:')) {
            const agent = trimmed.split(':')[1].trim();
            isRelevantSection = agent === '*';
            continue;
        }

        // Extract disallowed paths if in relevant section
        if (isRelevantSection && trimmed.startsWith('disallow:')) {
            const path = line.split(':', 2)[1].trim();
            if (path && path !== '/') {
                disallowedPaths.push(path);
            }
        }
    }

    return disallowedPaths;
}

/**
 * Checks if a path matches any disallowed pattern.
 */
function isPathDisallowed(path: string, disallowedPaths: string[]): boolean {
    return disallowedPaths.some((disallowed) => {
        // Handle wildcard patterns
        if (disallowed.endsWith('*')) {
            const prefix = disallowed.slice(0, -1);
            return path.startsWith(prefix);
        }
        // Exact or prefix match
        return path.startsWith(disallowed);
    });
}
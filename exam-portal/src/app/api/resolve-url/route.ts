import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering — never cache at the edge
export const dynamic = "force-dynamic";
export const maxDuration = 15; // Allow up to 15s for search fallbacks

// In-memory cache (persists for serverless function lifetime on Vercel)
const urlCache = new Map<string, { url: string; timestamp: number; version: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
const CACHE_VERSION = 2; // Bump this to invalidate all old cache entries

// Common error-page URL patterns that government sites redirect to
const ERROR_URL_PATTERNS = [
    /pagenotfound/i,
    /page-not-found/i,
    /404/i,
    /error/i,
    /not[-_]?found/i,
    /invalid/i,
    /expired/i,
    /unavailable/i,
    /removed/i,
    /default\.aspx$/i,    // many gov sites redirect dead pages to default.aspx
];

// Keywords in HTML body that indicate a soft-404 page
const ERROR_BODY_KEYWORDS = [
    "page not found",
    "page you requested",
    "does not exist",
    "has been removed",
    "no longer available",
    "link is broken",
    "link you followed",
    "404 error",
    "not found on this server",
    "requested url was not found",
    "this page has moved",
    "page has expired",
    "content not available",
];

/**
 * Checks if a URL looks like it redirected to an error page.
 * Government sites often return 200 OK for their custom error pages.
 */
function looksLikeErrorUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathAndQuery = parsed.pathname + parsed.search;
        return ERROR_URL_PATTERNS.some(pattern => pattern.test(pathAndQuery));
    } catch {
        return false;
    }
}

/**
 * Checks if HTML body content indicates a soft-404 page.
 * Only checks the first 5KB to be efficient.
 */
function looksLikeErrorPage(html: string): boolean {
    const snippet = html.substring(0, 5000).toLowerCase();
    return ERROR_BODY_KEYWORDS.some(keyword => snippet.includes(keyword));
}

/**
 * API Route: /api/resolve-url
 *
 * Resolves a reliable, live URL for a government exam notification.
 *
 * Strategy:
 * 1. Check if the original link is alive AND not a soft-404
 * 2. If dead or soft-404, search DuckDuckGo and grab first result
 * 3. Fallback to Google search
 * 4. Cache results for 24 hours
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "";
    const link = searchParams.get("link") || "";
    const source = searchParams.get("source") || "";

    if (!title) {
        return NextResponse.json({ url: "" }, { status: 400 });
    }

    // Check cache first (skip if nocache param is set for debugging)
    const cacheKey = `${title}::${link}`;
    const nocache = searchParams.get("nocache") === "1";
    const cached = urlCache.get(cacheKey);
    if (!nocache && cached && cached.version === CACHE_VERSION && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ url: cached.url, cached: true });
    }

    // Step 1: Verify the original link is TRULY alive (not a soft-404)
    let linkIsAlive = false;
    if (link && link.startsWith("http")) {
        try {
            // Use GET (not HEAD) so we can inspect the body for soft-404 detection
            // But limit the response size with a streaming approach
            const res = await fetch(link, {
                method: "GET",
                redirect: "follow",
                signal: AbortSignal.timeout(6000),
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html",
                },
            });

            if (res.ok) {
                const finalUrl = res.url || link;

                // Check 1: Did it redirect to an error-like URL?
                if (looksLikeErrorUrl(finalUrl)) {
                    linkIsAlive = false;
                }
                // Check 2: Does the page body look like an error page?
                else {
                    const body = await res.text();
                    if (looksLikeErrorPage(body)) {
                        linkIsAlive = false;
                    } else {
                        // Check 3: Is the final URL basically the homepage? (deep link → homepage redirect)
                        try {
                            const originalPath = new URL(link).pathname;
                            const finalPath = new URL(finalUrl).pathname;
                            if (originalPath.length > 5 && (finalPath === "/" || finalPath === "")) {
                                // Was a deep link, got redirected to homepage = dead link
                                linkIsAlive = false;
                            } else {
                                linkIsAlive = true;
                            }
                        } catch {
                            linkIsAlive = true;
                        }
                    }
                }
            }
        } catch {
            linkIsAlive = false;
        }
    }

    if (linkIsAlive) {
        urlCache.set(cacheKey, { url: link, timestamp: Date.now(), version: CACHE_VERSION });
        return NextResponse.json({ url: link, method: "direct" });
    }

    // Step 2: Extract domain for site-scoped search
    let domain = "";
    if (link && link.startsWith("http")) {
        try {
            domain = new URL(link).hostname;
        } catch {
            /* ignore */
        }
    }
    if (!domain && source) {
        const cleaned = source
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "");
        if (cleaned.includes(".")) domain = cleaned;
    }

    // Step 3: Try DuckDuckGo HTML search (more reliable than scraping Google)
    const resolvedFromSearch = await tryDuckDuckGo(title, domain);
    if (resolvedFromSearch) {
        urlCache.set(cacheKey, { url: resolvedFromSearch, timestamp: Date.now(), version: CACHE_VERSION });
        return NextResponse.json({ url: resolvedFromSearch, method: "search" });
    }

    // Step 4: Try Google search as backup
    const resolvedFromGoogle = await tryGoogleSearch(title, domain);
    if (resolvedFromGoogle) {
        urlCache.set(cacheKey, { url: resolvedFromGoogle, timestamp: Date.now(), version: CACHE_VERSION });
        return NextResponse.json({ url: resolvedFromGoogle, method: "google" });
    }

    // Step 5: Ultimate fallback — use the stored link anyway (better than nothing)
    // or construct a Google search URL for the user
    const fallbackUrl =
        link && link.startsWith("http")
            ? link
            : `https://www.google.com/search?q=${encodeURIComponent(
                title + " official notification"
            )}`;

    urlCache.set(cacheKey, { url: fallbackUrl, timestamp: Date.now(), version: CACHE_VERSION });
    return NextResponse.json({ url: fallbackUrl, method: "fallback" });
}

/**
 * Search DuckDuckGo HTML and extract first result URL
 */
async function tryDuckDuckGo(
    title: string,
    domain: string
): Promise<string | null> {
    try {
        const query = domain
            ? `${title} notification site:${domain}`
            : `${title} official notification apply online`;
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
            query
        )}`;

        const res = await fetch(ddgUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
            const html = await res.text();
            // DuckDuckGo HTML uses uddg= parameter for destination URLs
            const pattern = /uddg=(https?%3A%2F%2F[^&"]+)/g;
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const decoded = decodeURIComponent(match[1]);
                // Skip ad/tracker URLs
                if (
                    !decoded.includes("duckduckgo.com") &&
                    !decoded.includes("ad.doubleclick")
                ) {
                    return decoded;
                }
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * Search Google and extract first organic result URL
 */
async function tryGoogleSearch(
    title: string,
    domain: string
): Promise<string | null> {
    try {
        const query = domain
            ? `${title} notification apply online site:${domain}`
            : `${title} official notification apply online 2026`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
            query
        )}&num=5&hl=en`;

        const res = await fetch(googleUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
            const html = await res.text();
            const urlPattern = /\/url\?q=(https?:\/\/[^&"]+)/g;
            let match;
            while ((match = urlPattern.exec(html)) !== null) {
                const decoded = decodeURIComponent(match[1]);
                if (
                    !decoded.includes("google.com") &&
                    !decoded.includes("googleapis.com") &&
                    !decoded.includes("gstatic.com") &&
                    !decoded.includes("youtube.com") &&
                    !decoded.includes("webcache.") &&
                    !decoded.includes("translate.google")
                ) {
                    return decoded;
                }
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

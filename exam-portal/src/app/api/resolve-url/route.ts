import { NextRequest, NextResponse } from "next/server";

// In-memory cache to avoid repeated lookups (persists for the lifetime of the serverless function)
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * API Route: /api/resolve-url
 * 
 * Resolves a reliable, live URL for a government exam notification.
 * 
 * Strategy:
 * 1. Check if the original link is alive (HEAD request)
 * 2. If dead, search Google and extract the first organic result
 * 3. Cache results to avoid repeated lookups
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "";
    const link = searchParams.get("link") || "";
    const source = searchParams.get("source") || "";

    if (!title) {
        return NextResponse.json({ url: "" }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `${title}::${link}`;
    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ url: cached.url });
    }

    // Step 1: Check if the original link is alive
    if (link && link.startsWith("http")) {
        try {
            const headRes = await fetch(link, {
                method: "HEAD",
                redirect: "follow",
                signal: AbortSignal.timeout(5000),
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; RizzJobsBot/1.0)",
                },
            });

            if (headRes.ok) {
                // The original link is alive — use it directly
                const finalUrl = headRes.url || link; // headRes.url follows redirects
                urlCache.set(cacheKey, { url: finalUrl, timestamp: Date.now() });
                return NextResponse.json({ url: finalUrl });
            }
        } catch {
            // Link is dead or timed out, continue to search
        }
    }

    // Step 2: Extract domain for site-scoped search
    let domain = "";
    if (link && link.startsWith("http")) {
        try {
            domain = new URL(link).hostname;
        } catch { /* ignore */ }
    }
    if (!domain && source) {
        const cleaned = source.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (cleaned.includes(".")) domain = cleaned;
    }

    // Step 3: Search Google and grab first result
    const searchQuery = domain
        ? `${title} notification apply online site:${domain}`
        : `${title} official notification apply online 2026`;

    try {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=3&hl=en`;

        const searchRes = await fetch(googleUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (searchRes.ok) {
            const html = await searchRes.text();

            // Extract URLs from Google search results
            // Google wraps results in <a href="/url?q=ACTUAL_URL&...">
            const urlPattern = /\/url\?q=(https?:\/\/[^&"]+)/g;
            const matches: string[] = [];
            let match;

            while ((match = urlPattern.exec(html)) !== null) {
                const decoded = decodeURIComponent(match[1]);
                // Skip Google's own URLs, cached pages, and translation links
                if (
                    !decoded.includes("google.com") &&
                    !decoded.includes("googleapis.com") &&
                    !decoded.includes("gstatic.com") &&
                    !decoded.includes("youtube.com") &&
                    !decoded.includes("webcache.") &&
                    !decoded.includes("translate.google")
                ) {
                    matches.push(decoded);
                }
            }

            if (matches.length > 0) {
                const resolvedUrl = matches[0];
                urlCache.set(cacheKey, { url: resolvedUrl, timestamp: Date.now() });
                return NextResponse.json({ url: resolvedUrl });
            }
        }
    } catch {
        // Google search failed, try DuckDuckGo as backup
    }

    // Step 4: Backup — try DuckDuckGo HTML search
    try {
        const ddgQuery = domain
            ? `${title} notification site:${domain}`
            : `${title} official notification 2026`;
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;

        const ddgRes = await fetch(ddgUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (ddgRes.ok) {
            const html = await ddgRes.text();
            // DuckDuckGo HTML search uses uddg= parameter for result URLs
            const ddgPattern = /uddg=(https?%3A%2F%2F[^&"]+)/;
            const ddgMatch = ddgPattern.exec(html);
            if (ddgMatch) {
                const resolvedUrl = decodeURIComponent(ddgMatch[1]);
                urlCache.set(cacheKey, { url: resolvedUrl, timestamp: Date.now() });
                return NextResponse.json({ url: resolvedUrl });
            }
        }
    } catch {
        // DuckDuckGo also failed
    }

    // Step 5: Ultimate fallback — return the original link or a Google search URL
    const fallbackUrl = link && link.startsWith("http")
        ? link
        : `https://www.google.com/search?q=${encodeURIComponent(title + " official notification")}`;

    urlCache.set(cacheKey, { url: fallbackUrl, timestamp: Date.now() });
    return NextResponse.json({ url: fallbackUrl });
}

import type { MetadataRoute } from "next";

// SEO-tool crawlers and aggressive scrapers. They re-crawl all 5000+ sitemap
// URLs, and every ISR re-render they trigger costs Vercel write units (~10 per
// page at 8 KB/unit). They bring zero search traffic, so block them outright.
// Search engines (Google/Bing) and AI-answer bots (GPTBot, ClaudeBot,
// PerplexityBot, CCBot) stay allowed - those drive real visibility.
const BLOCKED_BOTS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "serpstatbot",
  "ZoominfoBot",
  "PetalBot",
  "Bytespider",
  "Amazonbot",
  "MegaIndex.ru",
  "SeznamBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rizzjobs.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/private/", "/admin/", "/dashboard/", "/auth/"],
      },
      ...BLOCKED_BOTS.map((bot) => ({
        userAgent: bot,
        disallow: "/",
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

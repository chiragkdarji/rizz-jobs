import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const revalidate = 3600;

const BASE_URL = "https://rizzjobs.in";

const IPL_TEAM_SLUGS = [
  "mumbai-indians",
  "chennai-super-kings",
  "royal-challengers-bengaluru",
  "kolkata-knight-riders",
  "sunrisers-hyderabad",
  "delhi-capitals",
  "punjab-kings",
  "rajasthan-royals",
  "lucknow-super-giants",
  "gujarat-titans",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Job / Exam section ───────────────────────────────────────────────────
  let notificationUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, slug, created_at, updated_at")
      .eq("is_active", true);
    if (data) {
      notificationUrls = data.map((n) => ({
        url: `${BASE_URL}/exam/${n.slug || n.id}`,
        lastModified: new Date(n.updated_at || n.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch notifications", error);
  }

  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("sort_order");
    if (data) {
      categoryUrls = data.map((c) => ({
        url: `${BASE_URL}/jobs/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch categories", error);
  }

  // ─── Cricket / IPL section ────────────────────────────────────────────────
  // Listing pages carry no lastModified: stamping new Date() marked every URL
  // as just-changed on each sitemap fetch, inviting crawlers to re-crawl the
  // whole site continuously.
  const cricketStaticUrls: MetadataRoute.Sitemap = [
    // Live pages: highest priority + always changing
    { url: `${BASE_URL}/cricket/live`,               changeFrequency: "always",  priority: 1.0 },
    { url: `${BASE_URL}/cricket/ipl`,                changeFrequency: "hourly",  priority: 1.0 },
    { url: `${BASE_URL}/cricket/ipl/points-table`,   changeFrequency: "hourly",  priority: 0.95 },
    { url: `${BASE_URL}/cricket/ipl/orange-cap`,     changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/cricket/ipl/purple-cap`,     changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/cricket/ipl/schedule`,       changeFrequency: "daily",   priority: 0.85 },
    { url: `${BASE_URL}/cricket/ipl/news`,           changeFrequency: "hourly",  priority: 0.85 },
    { url: `${BASE_URL}/cricket/ipl/teams`,          changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/cricket/ipl/stats`,          changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/cricket/ipl/fantasy`,        changeFrequency: "daily",   priority: 0.75 },
    { url: `${BASE_URL}/cricket`,                    changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/cricket/upcoming`,           changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/cricket/rankings`,           changeFrequency: "weekly",  priority: 0.75 },
    { url: `${BASE_URL}/cricket/records`,            changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/cricket/news`,               changeFrequency: "hourly",  priority: 0.85 },
    ...IPL_TEAM_SLUGS.map((slug) => ({
      url: `${BASE_URL}/cricket/ipl/teams/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];

  // ─── News section ─────────────────────────────────────────────────────────
  const newsStaticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/news`,            changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/news/finance`,    changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/business`,   changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/markets`,    changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/economy`,    changeFrequency: "daily",  priority: 0.8 },
    { url: `${BASE_URL}/news/startups`,   changeFrequency: "daily",  priority: 0.8 },
  ];

  // Paginate news articles — no 500-item cap, fetch all in batches
  const newsArticleUrls: MetadataRoute.Sitemap = [];
  try {
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("news_articles")
        .select("slug, published_at, updated_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (!data || data.length === 0) break;

      for (const a of data) {
        const age = Date.now() - new Date(a.published_at).getTime();
        const oneDayMs = 86_400_000;
        newsArticleUrls.push({
          url: `${BASE_URL}/news/${a.slug}`,
          lastModified: new Date(a.updated_at || a.published_at),
          // Recent articles change more often (corrections, updates)
          changeFrequency: age < oneDayMs ? ("hourly" as const) : ("weekly" as const),
          priority: age < oneDayMs ? 0.9 : 0.7,
        });
      }

      if (data.length < batchSize) break;
      offset += batchSize;
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch news articles", error);
  }

  // ─── Hub / jobs listing ───────────────────────────────────────────────────
  const hubUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL,           changeFrequency: "daily",  priority: 1.0 },
    { url: `${BASE_URL}/jobs`, changeFrequency: "daily",  priority: 0.9 },
  ];

  // ─── Legal / static pages ────────────────────────────────────────────────
  const legalUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/about`,      lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/contact`,    lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/privacy`,    lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/terms`,      lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/disclaimer`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
  ];

  return [
    ...hubUrls,
    ...cricketStaticUrls,
    ...newsStaticUrls,
    ...legalUrls,
    ...categoryUrls,
    ...newsArticleUrls,
    ...notificationUrls,
  ];
}

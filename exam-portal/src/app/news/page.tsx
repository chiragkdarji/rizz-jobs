import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";
import MarketMovers from "@/components/MarketMovers";
import WorldMarketsRow from "@/components/WorldMarketsRow";
import Link from "next/link";

export const revalidate = 600;

const PAGE_SIZE = 24;
const BASE_URL = "https://rizzjobs.in/news";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const canonical = page === 1 && !q ? BASE_URL : `${BASE_URL}?page=${page}`;

  return {
    title:
      page === 1
        ? "Latest News India | Finance, Business & Markets | Rizz Jobs"
        : `Latest News India | Page ${page} | Rizz Jobs`,
    description: "Latest Indian finance, business, markets, economy and startup news — stay informed on what matters.",
    keywords: ["Indian finance news", "business news India", "stock market news", "RBI news", "Indian economy", "startup news India"],
    openGraph: {
      title:
        page === 1
          ? "Latest News India | Finance, Business & Markets | Rizz Jobs"
          : `Latest News India | Page ${page} | Rizz Jobs`,
      description: "Latest Indian finance, business, markets, economy and startup news.",
      url: canonical,
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Latest News India | Rizz Jobs",
      description: "Latest Indian finance & business news updates.",
    },
    alternates: {
      canonical,
      types: {
        "application/rss+xml": "https://rizzjobs.in/news/feed.xml",
      },
    },
  };
}

export default async function NewsPage({ searchParams }: Props) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const searchQuery = q?.trim().slice(0, 100) ?? "";

  const supabase = getSupabase();

  let query = supabase
    .from("news_articles")
    .select(
      "id, slug, headline, summary, category, source_name, published_at, image_url, image_alt",
      { count: "exact" }
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (searchQuery) {
    query = query.ilike("headline", `%${searchQuery}%`);
  }

  const { data: articles, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: BASE_URL },
    ],
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6 flex items-end justify-between gap-4"
          style={{ borderBottom: "1px solid #1e1e24" }}
        >
          <div>
            <h1
              className="text-[clamp(1.6rem,4vw,2.8rem)] text-[#f2ede6] leading-none"
              style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
            >
              {searchQuery ? (
                <>
                  Results for{" "}
                  <span style={{ color: "#f0a500" }}>&ldquo;{searchQuery}&rdquo;</span>
                </>
              ) : (
                "Finance \u0026 Business News"
              )}
            </h1>
            {searchQuery && (
              <Link
                href="/news"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "#7c7888" }}
              >
                ← Clear search
              </Link>
            )}
          </div>
          <p className="hidden sm:block text-[10px] text-[#7c7888] uppercase tracking-wide shrink-0">
            {todayLabel}
          </p>
        </div>

        {articles && articles.length > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            {/* ── Hero Article ──────────────────────────────────────────── */}
            {articles[0] && (
              <div className="mt-6">
                <NewsCard variant="hero" {...articles[0]} />
              </div>
            )}

            {/* ── Featured 3 ────────────────────────────────────────────── */}
            {articles.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 mt-8 gap-6">
                {articles.slice(1, 4).map((article) => (
                  <NewsCard key={article.id} variant="featured" {...article} />
                ))}
              </div>
            )}

            {/* ── Market Data ───────────────────────────────────────────── */}
            {!searchQuery && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
                <div className="lg:col-span-2">
                  <WorldMarketsRow />
                </div>
                <div>
                  <MarketMovers />
                </div>
              </div>
            )}

            {/* ── Latest section ────────────────────────────────────────── */}
            {articles.length > 4 && (
              <div className="mt-10">
                {/* Section header */}
                <div className="flex items-center gap-4 mb-2">
                  <span
                    style={{
                      fontFamily: "var(--font-ui, system-ui, sans-serif)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.20em",
                      textTransform: "uppercase",
                      color: "#f0a500",
                      flexShrink: 0,
                    }}
                  >
                    Latest
                  </span>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e1e26" }} />
                </div>

                {/* Two-column compact list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                  {articles.slice(4).map((article) => (
                    <NewsCard key={article.id} variant="compact" {...article} />
                  ))}
                </div>
              </div>
            )}

            <NewsPagination currentPage={page} totalPages={totalPages} basePath="/news" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center py-32 text-center">
            <div
              className="w-12 h-12 mb-6 flex items-center justify-center"
              style={{ border: "1px solid #1e1e24" }}
            >
              <span style={{ color: "#f0a500" }}>◈</span>
            </div>
            <p className="text-[#7c7888] text-sm uppercase tracking-widest font-bold mb-2">No articles yet</p>
            <p className="text-[#7c7888] text-xs">The news scraper runs every 6 hours. Check back soon.</p>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>
    </>
  );
}

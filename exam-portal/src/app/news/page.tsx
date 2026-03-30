import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";
import NewsCategoryTabs from "@/components/NewsCategoryTabs";

export const revalidate = 600;

const PAGE_SIZE = 24;
const BASE_URL = "https://rizzjobs.in/news";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const canonical = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;

  return {
    title:
      page === 1
        ? "Latest News India | Finance, Business & Markets | Rizz Jobs"
        : `Latest News India | Page ${page} | Rizz Jobs`,
    description:
      "Latest Indian finance, business, markets, economy and startup news. Updated twice daily from Economic Times, Mint, and Business Standard.",
    keywords: ["Indian finance news", "business news India", "stock market news", "RBI news", "Indian economy", "startup news India"],
    openGraph: {
      title:
        page === 1
          ? "Latest News India | Finance, Business & Markets | Rizz Jobs"
          : `Latest News India | Page ${page} | Rizz Jobs`,
      description: "Twice-daily updates on Indian finance, business, markets, economy and startups.",
      url: canonical,
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Latest News India | Rizz Jobs",
      description: "Twice-daily Indian finance & business news updates.",
    },
    alternates: {
      canonical,
      types: { "application/rss+xml": "https://rizzjobs.in/news-sitemap.xml" },
    },
  };
}

export default async function NewsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getSupabase();
  const { data: articles, count } = await supabase
    .from("news_articles")
    .select(
      "id, slug, headline, summary, category, source_name, published_at, image_url, image_alt",
      { count: "exact" }
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(from, to);

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
          className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-5"
          style={{ borderBottom: "1px solid #1e1e24" }}
        >
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-[0.22em] mb-2"
                style={{ color: "#f0a500" }}
              >
                Financial Intelligence
              </p>
              <h1
                className="text-[clamp(1.6rem,4vw,2.8rem)] text-[#f2ede6] leading-none"
                style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
              >
                Finance &amp; Business News
              </h1>
            </div>
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-[10px] text-[#52505e] uppercase tracking-wide">{todayLabel}</p>
              <p className="text-[10px] text-[#3a3848] mt-1">Updated twice daily</p>
            </div>
          </div>

          <NewsCategoryTabs activeHref="/news" />
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
              <div
                className="grid grid-cols-1 sm:grid-cols-3 mt-px"
                style={{ gap: "1px", backgroundColor: "#1e1e24" }}
              >
                {articles.slice(1, 4).map((article) => (
                  <div key={article.id} style={{ backgroundColor: "#070708", padding: "24px 0" }}>
                    <NewsCard variant="featured" {...article} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Latest section ────────────────────────────────────────── */}
            {articles.length > 4 && (
              <div className="mt-10">
                {/* Section header */}
                <div className="flex items-center gap-4 mb-1">
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.22em] shrink-0"
                    style={{ color: "#f0a500" }}
                  >
                    Latest
                  </span>
                  <div className="flex-1" style={{ height: "1px", backgroundColor: "#1e1e24" }} />
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
            <p className="text-[#52505e] text-sm uppercase tracking-widest font-bold mb-2">No articles yet</p>
            <p className="text-[#3a3848] text-xs">The news scraper runs every 6 hours. Check back soon.</p>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>
    </>
  );
}

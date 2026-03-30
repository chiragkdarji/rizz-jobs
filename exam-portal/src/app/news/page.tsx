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
    keywords: [
      "Indian finance news",
      "business news India",
      "stock market news",
      "RBI news",
      "Indian economy",
      "startup news India",
    ],
    openGraph: {
      title:
        page === 1
          ? "Latest News India | Finance, Business & Markets | Rizz Jobs"
          : `Latest News India | Page ${page} | Rizz Jobs`,
      description:
        "Twice-daily updates on Indian finance, business, markets, economy and startups.",
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Finance &amp; Business News</h1>
          <p className="text-gray-400 text-sm">
            India&apos;s top finance, business, markets, economy &amp; startup stories · Updated twice daily
          </p>
        </div>

        <NewsCategoryTabs activeHref="/news" />

        {articles && articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <NewsCard key={article.id} {...article} />
              ))}
            </div>
            <NewsPagination
              currentPage={page}
              totalPages={totalPages}
              basePath="/news"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 text-lg font-semibold mb-2">No articles yet</p>
            <p className="text-gray-600 text-sm">
              The news scraper runs twice daily. Check back soon.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

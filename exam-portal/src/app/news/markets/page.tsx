import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";
import NewsCategoryTabs from "@/components/NewsCategoryTabs";

export const revalidate = 600;

const PAGE_SIZE = 24;
const BASE_URL = "https://rizzjobs.in/news/markets";

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
        ? "Market News India | Sensex, Nifty & Stock Market Updates | Rizz Jobs"
        : `Market News India | Page ${page} | Rizz Jobs`,
    description:
      "Latest Indian stock market news — Sensex, Nifty 50, NSE, BSE, FII/DII activity and equity market updates. Updated twice daily.",
    keywords: ["stock market news India", "NSE BSE news", "Nifty 50", "Sensex today", "IPO news India"],
    openGraph: {
      title: "Market News India | Sensex, Nifty & Stock Market Updates | Rizz Jobs",
      description: "NSE, BSE, Nifty & equity market news. Updated twice daily.",
      url: canonical,
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Market News India | Rizz Jobs",
      description: "Latest Sensex, Nifty, NSE/BSE and stock market news.",
    },
    alternates: { canonical },
  };
}

export default async function MarketsNewsPage({ searchParams }: Props) {
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
    .eq("category", "markets")
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "Markets", item: BASE_URL },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Markets News</h1>
          <p className="text-gray-400 text-sm">Sensex, Nifty 50, NSE, BSE &amp; equity markets · Updated twice daily</p>
        </div>
        <NewsCategoryTabs activeHref="/news/markets" />
        {articles && articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => <NewsCard key={a.id} {...a} />)}
            </div>
            <NewsPagination currentPage={page} totalPages={totalPages} basePath="/news/markets" />
          </>
        ) : (
          <p className="text-gray-500 text-center py-24">No markets articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}

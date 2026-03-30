import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Finance & Business News India | Rizz Jobs",
    description:
      "Latest Indian finance, business, markets, economy and startup news. Updated every hour from trusted sources like Economic Times, Mint, and Business Standard.",
    keywords: [
      "Indian finance news",
      "business news India",
      "stock market news",
      "RBI news",
      "Indian economy",
      "startup news India",
    ],
    openGraph: {
      title: "Finance & Business News India | Rizz Jobs",
      description:
        "Hourly updates on Indian finance, business, and markets from top sources.",
      url: "https://rizzjobs.in/news",
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Finance & Business News India | Rizz Jobs",
      description: "Hourly Indian finance & business news updates.",
    },
    alternates: {
      canonical: "https://rizzjobs.in/news",
      types: {
        "application/rss+xml": "https://rizzjobs.in/news-sitemap.xml",
      },
    },
  };
}

const CATEGORIES = [
  "all",
  "finance",
  "business",
  "markets",
  "economy",
  "startups",
] as const;
type Category = (typeof CATEGORIES)[number];

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function NewsPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const activeCategory: Category = CATEGORIES.includes(category as Category)
    ? (category as Category)
    : "all";

  const supabase = getSupabase();
  let query = supabase
    .from("news_articles")
    .select(
      "id, slug, headline, summary, category, source_name, published_at, image_url, image_alt"
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(24);

  if (activeCategory !== "all") {
    query = query.eq("category", activeCategory);
  }

  const { data: articles } = await query;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://rizzjobs.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "News",
        item: "https://rizzjobs.in/news",
      },
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
          <h1 className="text-3xl font-black mb-1">Finance & Business News</h1>
          <p className="text-gray-400 text-sm">
            Updated every hour · Indian markets & economy
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={cat === "all" ? "/news" : `/news?category=${cat}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                activeCategory === cat
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-indigo-500/50 hover:text-white"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </a>
          ))}
        </div>

        {/* Article Grid */}
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <NewsCard key={article.id} {...article} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 text-lg font-semibold mb-2">
              No articles yet
            </p>
            <p className="text-gray-600 text-sm">
              The news scraper runs every hour. Check back soon.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

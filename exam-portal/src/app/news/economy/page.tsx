import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "India Economy News | GDP, Inflation & Policy | Rizz Jobs",
    description:
      "Latest Indian economy news — GDP growth, inflation, monetary policy, fiscal policy, trade, and macroeconomic indicators. Updated hourly.",
    keywords: ["India economy news", "GDP India", "inflation India", "fiscal policy India", "macroeconomy India"],
    openGraph: {
      title: "India Economy News | Rizz Jobs",
      description: "GDP, inflation, policy & macroeconomic news from India. Updated hourly.",
      url: "https://rizzjobs.in/news/economy",
      type: "website",
    },
    alternates: { canonical: "https://rizzjobs.in/news/economy" },
  };
}

export default async function EconomyNewsPage() {
  const supabase = getSupabase();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, slug, headline, summary, category, source_name, published_at, image_url, image_alt")
    .eq("is_published", true)
    .eq("category", "economy")
    .order("published_at", { ascending: false })
    .limit(24);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "Economy", item: "https://rizzjobs.in/news/economy" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Economy News</h1>
          <p className="text-gray-400 text-sm">GDP, inflation, monetary & fiscal policy · Updated hourly</p>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => <NewsCard key={a.id} {...a} />)}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-24">No economy articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}

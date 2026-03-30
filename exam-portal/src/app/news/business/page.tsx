import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Business News India | Corporate, M&A & Industry | Rizz Jobs",
    description:
      "Latest Indian business news — corporate results, mergers & acquisitions, industry trends, and business strategy. Updated hourly.",
    keywords: ["business news India", "corporate news", "M&A India", "industry news", "company results India"],
    openGraph: {
      title: "Business News India | Rizz Jobs",
      description: "Corporate results, M&A, and Indian business news. Updated hourly.",
      url: "https://rizzjobs.in/news/business",
      type: "website",
    },
    alternates: { canonical: "https://rizzjobs.in/news/business" },
  };
}

export default async function BusinessNewsPage() {
  const supabase = getSupabase();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, slug, headline, summary, category, source_name, published_at, image_url, image_alt")
    .eq("is_published", true)
    .eq("category", "business")
    .order("published_at", { ascending: false })
    .limit(24);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "Business", item: "https://rizzjobs.in/news/business" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Business News</h1>
          <p className="text-gray-400 text-sm">Corporate results, M&A & Indian business trends · Updated hourly</p>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => <NewsCard key={a.id} {...a} />)}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-24">No business articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}

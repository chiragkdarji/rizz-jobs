import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Indian Startup News | Funding, IPO & Tech | Rizz Jobs",
    description:
      "Latest Indian startup news — venture funding rounds, unicorn updates, tech startups, IPOs, and the Indian startup ecosystem. Updated hourly.",
    keywords: ["startup news India", "Indian unicorn", "startup funding India", "tech startup India", "IPO India"],
    openGraph: {
      title: "Indian Startup News | Rizz Jobs",
      description: "Funding, unicorns & the Indian startup ecosystem. Updated hourly.",
      url: "https://rizzjobs.in/news/startups",
      type: "website",
    },
    alternates: { canonical: "https://rizzjobs.in/news/startups" },
  };
}

export default async function StartupsNewsPage() {
  const supabase = getSupabase();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, slug, headline, summary, category, source_name, published_at, image_url, image_alt")
    .eq("is_published", true)
    .eq("category", "startups")
    .order("published_at", { ascending: false })
    .limit(24);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "Startups", item: "https://rizzjobs.in/news/startups" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Startup News</h1>
          <p className="text-gray-400 text-sm">Funding rounds, unicorns & Indian startup ecosystem · Updated hourly</p>
        </div>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => <NewsCard key={a.id} {...a} />)}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-24">No startup articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}

import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";
import NewsCategoryTabs from "@/components/NewsCategoryTabs";

export const revalidate = 600;

const PAGE_SIZE = 24;
const BASE_URL = "https://rizzjobs.in/news/startups";

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
        ? "Startup News India | Funding, IPO & Tech Ventures | Rizz Jobs"
        : `Startup News India | Page ${page} | Rizz Jobs`,
    description:
      "Latest Indian startup news — venture funding rounds, unicorn updates, tech startups, IPOs, and the Indian startup ecosystem. Updated twice daily.",
    keywords: ["startup news India", "Indian unicorn", "startup funding India", "tech startup India", "IPO India"],
    openGraph: {
      title: "Startup News India | Funding, IPO & Tech Ventures | Rizz Jobs",
      description: "Funding, unicorns & the Indian startup ecosystem. Updated twice daily.",
      url: canonical,
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Startup News India | Rizz Jobs",
      description: "Latest Indian startup funding, IPO and tech venture news.",
    },
    alternates: { canonical },
  };
}

export default async function StartupsNewsPage({ searchParams }: Props) {
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
    .eq("category", "startups")
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "Startups", item: BASE_URL },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Startup News</h1>
          <p className="text-gray-400 text-sm">Funding rounds, unicorns &amp; Indian startup ecosystem · Updated twice daily</p>
        </div>
        <NewsCategoryTabs activeHref="/news/startups" />
        {articles && articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => <NewsCard key={a.id} {...a} />)}
            </div>
            <NewsPagination currentPage={page} totalPages={totalPages} basePath="/news/startups" />
          </>
        ) : (
          <p className="text-gray-500 text-center py-24">No startup articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}

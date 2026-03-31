import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";

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
    description: "Latest Indian startup news — funding rounds, unicorn valuations, IPO listings and tech venture ecosystem.",
    keywords: ["startup news India", "Indian unicorn", "startup funding India", "tech startup India", "IPO India"],
    openGraph: {
      title: "Startup News India | Funding, IPO & Tech Ventures | Rizz Jobs",

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
      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: "#f43f5e" }}>Startups</p>
              <h1 className="text-[clamp(1.6rem,4vw,2.8rem)] text-[#f2ede6] leading-none" style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}>Startup News</h1>
            </div>
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-[10px] text-[#52505e] uppercase tracking-wide">Funding · Unicorns · Ecosystem</p>

            </div>
          </div>
        </div>
        {articles && articles.length > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {articles.map((a) => <NewsCard key={a.id} variant="compact" {...a} />)}
            </div>
            <NewsPagination currentPage={page} totalPages={totalPages} basePath="/news/startups" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center py-32 text-center">
            <p className="text-[#52505e] text-sm uppercase tracking-widest font-bold mb-2">No articles yet</p>
            <p className="text-[#3a3848] text-xs">Check back soon.</p>
          </div>
        )}
        <div className="pb-16" />
      </div>
    </>
  );
}

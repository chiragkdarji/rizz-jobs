import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase-server";
import NewsCard from "@/components/NewsCard";
import NewsPagination from "@/components/NewsPagination";
import IplLiveScores from "@/components/IplLiveScores";
import IplSchedule from "@/components/IplSchedule";

export const revalidate = 600;

const PAGE_SIZE = 18;
const BASE_URL = "https://rizzjobs.in/news/ipl";

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
        ? "IPL 2026 Live Scores, Points Table & News | Rizz Jobs"
        : `IPL 2026 News | Page ${page} | Rizz Jobs`,
    description:
      "IPL 2026 live scores, points table, schedule, match updates and Indian Premier League news coverage.",
    keywords: ["IPL 2026", "IPL live score", "IPL points table", "IPL schedule", "Indian Premier League 2026", "cricket news India"],
    openGraph: {
      title: "IPL 2026 Live Scores, Points Table & News | Rizz Jobs",
      url: canonical,
      siteName: "Rizz Jobs",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "IPL 2026 | Rizz Jobs",
      description: "Live scores, points table and IPL 2026 news.",
    },
    alternates: { canonical },
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-3">
      <span
        style={{
          fontFamily: "var(--font-ui, system-ui, sans-serif)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "#06b6d4",
          flexShrink: 0,
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", backgroundColor: "#1e1e26" }} />
    </div>
  );
}

export default async function IplPage({ searchParams }: Props) {
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
    .eq("category", "ipl")
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: "IPL", item: BASE_URL },
    ],
  };

  const hasCricApiKey = !!process.env.CRICAPI_KEY;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>

        {/* ── Page header ────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6" style={{ borderBottom: "1px solid #1e1e26" }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p
                style={{
                  fontFamily: "var(--font-ui, system-ui, sans-serif)",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#06b6d4",
                  marginBottom: "6px",
                }}
              >
                IPL 2026
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                  fontWeight: 400,
                  color: "#f2ede6",
                  lineHeight: 1,
                }}
              >
                Indian Premier League
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {[
                { label: "Scores", href: "#scores" },
                { label: "Points Table", href: "#points-table" },
                { label: "Schedule", href: "#schedule" },
              ].map(({ label, href }, i) => (
                <span key={label} className="flex items-center gap-3">
                  {i > 0 && <span style={{ color: "#2a2a34", fontSize: "10px" }}>·</span>}
                  <a
                    href={href}
                    style={{
                      color: "#9898aa",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-ui, system-ui, sans-serif)",
                      textDecoration: "none",
                    }}
                  >
                    {label}
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live data ──────────────────────────────────────────── */}
        {hasCricApiKey ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Live scores */}
              <div className="lg:col-span-1" id="scores">
                <SectionLabel>Live Scores</SectionLabel>
                <IplLiveScores />
              </div>

              {/* Right: Points table + Schedule stacked */}
              <div className="lg:col-span-2 space-y-6">
                <div id="points-table">
                  <SectionLabel>Points Table</SectionLabel>
                  <a
                    href="https://www.iplt20.com/points-table/men"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div
                      className="flex items-center justify-between px-5 py-4"
                      style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}
                    >
                      <div>
                        <p style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-ui, system-ui, sans-serif)", marginBottom: "3px" }}>
                          IPL 2026 Points Table
                        </p>
                        <p style={{ color: "#9898aa", fontSize: "11px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                          View live standings on iplt20.com ↗
                        </p>
                      </div>
                      <span style={{ color: "#06b6d4", fontSize: "20px" }}>🏏</span>
                    </div>
                  </a>
                </div>
                <div id="schedule">
                  <SectionLabel>Upcoming Fixtures</SectionLabel>
                  <IplSchedule />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* API key not configured — show setup notice */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5"
              style={{ border: "1px solid #2a2a1a", backgroundColor: "#0d0d08" }}
            >
              <div style={{ fontSize: "24px", flexShrink: 0 }}>🏏</div>
              <div>
                <p style={{ color: "#f0a500", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-ui, system-ui, sans-serif)", marginBottom: "4px" }}>
                  Live scores require a CricAPI key
                </p>
                <p style={{ color: "#9898aa", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                  Get a free key at{" "}
                  <span style={{ color: "#06b6d4" }}>cricapi.com</span>
                  {" "}(100 req/day free), then add{" "}
                  <code style={{ backgroundColor: "#1a1a22", padding: "1px 5px", fontSize: "11px", color: "#e8e4dc" }}>CRICAPI_KEY=your_key</code>
                  {" "}to your environment variables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── News articles ──────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          {articles && articles.length > 0 ? (
            <>
              <SectionLabel>Latest IPL News</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((a) => (
                  <NewsCard key={a.id} variant="featured" {...a} />
                ))}
              </div>
              <NewsPagination currentPage={page} totalPages={totalPages} basePath="/news/ipl" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p style={{ color: "#9898aa", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                No IPL articles yet — they appear once the scraper picks up IPL content.
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

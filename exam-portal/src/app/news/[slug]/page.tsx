import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { proxyNewsImage } from "@/lib/image-proxy";
import ArticleScrollProgress from "@/components/ArticleScrollProgress";
import ArticleShareBar from "@/components/ArticleShareBar";

export const revalidate = 3600;

interface Article {
  id: string;
  slug: string;
  headline: string;
  content: string;
  summary: string;
  category: string;
  source_name: string;
  source_url: string;
  original_url: string;
  published_at: string;
  updated_at?: string;
  image_url?: string | null;
  image_alt?: string | null;
  tags?: string[];
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  };
}

const CATEGORY_ACCENT: Record<string, string> = {
  finance:  "#3b82f6",
  business: "#a855f7",
  markets:  "#22c55e",
  economy:  "#f59e0b",
  startups: "#f43f5e",
};

async function fetchArticle(slug: string): Promise<Article | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  return data ?? null;
}

type RelatedArticle = Pick<Article, "id" | "slug" | "headline" | "summary" | "category" | "published_at" | "image_url" | "image_alt">;

async function fetchRelated(category: string, excludeSlug: string): Promise<RelatedArticle[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("news_articles")
    .select("id, slug, headline, summary, category, published_at, image_url, image_alt")
    .eq("is_published", true)
    .eq("category", category)
    .neq("slug", excludeSlug)
    .order("published_at", { ascending: false })
    .limit(3);
  return data ?? [];
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("news_articles")
    .select("slug")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { title: "Article Not Found | Rizz Jobs" };

  const canonicalUrl = `https://rizzjobs.in/news/${article.slug}`;
  const seo = article.seo ?? {};
  const image = article.image_url ?? "https://rizzjobs.in/og-image.png";

  return {
    title: `${seo.meta_title ?? article.headline} | Rizz Jobs`,
    description: seo.meta_description ?? article.summary,
    keywords: seo.meta_keywords,
    openGraph: {
      title: seo.meta_title ?? article.headline,
      description: seo.meta_description ?? article.summary,
      url: canonicalUrl,
      siteName: "Rizz Jobs",
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at ?? article.published_at,
      authors: ["Rizz Jobs News Desk"],
      images: [{ url: image, alt: article.image_alt ?? article.headline, width: 1200, height: 630 }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.meta_title ?? article.headline,
      description: seo.meta_description ?? article.summary,
      images: [image],
    },
    alternates: { canonical: canonicalUrl },
  };
}

function estimateReadTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

function getTakeaways(summary: string): string[] {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  const related = article ? await fetchRelated(article.category, slug) : [];
  if (!article) notFound();

  const canonicalUrl = `https://rizzjobs.in/news/${article.slug}`;
  const publishedDate = new Date(article.published_at).toISOString();
  const modifiedDate = new Date(article.updated_at ?? article.published_at).toISOString();
  const image = article.image_url ?? "https://rizzjobs.in/og-image.png";
  const categoryLabel = article.category.charAt(0).toUpperCase() + article.category.slice(1);
  const accent = CATEGORY_ACCENT[article.category] ?? CATEGORY_ACCENT.finance;
  const optimizedSrc = proxyNewsImage(article.image_url);
  const readTime = estimateReadTime(article.content);
  const takeaways = getTakeaways(article.summary);

  const formattedDate = new Date(article.published_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── Schemas ──────────────────────────────────────────────────────────────────
  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.summary,
    articleBody: article.content,
    datePublished: publishedDate,
    dateModified: modifiedDate,
    url: canonicalUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    author: { "@type": "Organization", name: "Rizz Jobs News Desk", url: "https://rizzjobs.in" },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": "https://rizzjobs.in/#newsmediaorganization",
      name: "Rizz Jobs",
      logo: { "@type": "ImageObject", url: "https://rizzjobs.in/logo.png", width: 512, height: 512 },
    },
    image: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
    keywords: (article.tags ?? []).join(", "),
    articleSection: categoryLabel,
    inLanguage: "en-IN",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rizzjobs.in" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://rizzjobs.in/news" },
      { "@type": "ListItem", position: 3, name: categoryLabel, item: `https://rizzjobs.in/news/${article.category}` },
      { "@type": "ListItem", position: 4, name: article.headline },
    ],
  };

  const paragraphs = article.content.split("\n\n").filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <ArticleScrollProgress />

      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>

        {/* ── Hero Image ─────────────────────────────────────────────── */}
        <div className="relative w-full" style={{ height: "clamp(280px, 48vw, 520px)" }}>
          {optimizedSrc ? (
            <Image
              src={optimizedSrc}
              alt={article.image_alt ?? article.headline}
              fill priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0d0d18 0%, #141420 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/60 to-[#070708]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070708]/50 to-transparent" />
          <div className="absolute top-6 left-6">
            <span
              className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 text-black"
              style={{ backgroundColor: accent }}
            >
              {article.category}
            </span>
          </div>
        </div>

        {/* ── Article Content ─────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ marginTop: "-80px", position: "relative", zIndex: 10 }}>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6" aria-label="Breadcrumb">
            <Link href="/news" className="text-[10px] uppercase tracking-[0.16em] font-bold transition-colors" style={{ color: "#7c7888" }}>
              News
            </Link>
            <span style={{ color: "#2a2838" }} className="text-[10px]">›</span>
            <Link href={`/news/${article.category}`} className="text-[10px] uppercase tracking-[0.16em] font-bold transition-colors capitalize" style={{ color: "#7c7888" }}>
              {categoryLabel}
            </Link>
          </nav>

          {/* Headline */}
          <h1
            className="text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.12] text-[#f2ede6] mb-6"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            {article.headline}
          </h1>

          {/* Byline */}
          <div
            className="flex items-center flex-wrap gap-x-4 gap-y-1 py-4 mb-8"
            style={{ borderTop: "1px solid #1e1e24", borderBottom: "1px solid #1e1e24" }}
          >
            <span className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>
              Rizz Jobs News Desk
            </span>
            <span style={{ color: "#2a2838" }}>·</span>
            <time dateTime={article.published_at} className="text-[#7c7888] text-[11px] uppercase tracking-wide">
              {formattedDate}
            </time>
            <span style={{ color: "#2a2838" }}>·</span>
            <span className="text-[#7c7888] text-[11px]">{readTime} min read</span>
          </div>

          {/* ── Market Briefing Box ─────────────────────────────────── */}
          {takeaways.length > 0 && (
            <div
              className="mb-8 p-5"
              style={{
                backgroundColor: "#0d0d10",
                borderLeft: `3px solid ${accent}`,
                border: `1px solid #1e1e24`,
                borderLeftWidth: "3px",
                borderLeftColor: accent,
              }}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: accent }}>
                Market Briefing
              </p>
              <ul className="space-y-2.5">
                {takeaways.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 mt-[5px] w-1 h-1 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <span className="text-[#c8c4bc] text-[13px] leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article Body */}
          <article className="mb-8">
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="leading-[1.85] mb-5"
                style={{
                  color: i === 0 ? "#d4cfc7" : "#9a9699",
                  fontFamily: i === 0 ? "'DM Serif Display', 'Georgia', serif" : undefined,
                  fontWeight: i === 0 ? 400 : undefined,
                  fontSize: i === 0 ? "1.15rem" : "0.975rem",
                }}
              >
                {paragraph}
              </p>
            ))}
          </article>

          {/* ── Share Bar ────────────────────────────────────────────── */}
          <ArticleShareBar
            url={canonicalUrl}
            headline={article.headline}
            accent={accent}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-10">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: "#7c7888" }}>
                Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-[0.1em] font-bold px-3 py-1"
                    style={{ color: "#7c7888", border: "1px solid #1e1e24", backgroundColor: "#0d0d10" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Newsletter CTA ───────────────────────────────────────── */}
          <div
            className="my-10 p-8 text-center"
            style={{ backgroundColor: "#0d0d10", border: "1px solid #1e1e24" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: accent }}>
              Stay Informed
            </p>
            <h3
              className="text-[1.5rem] text-[#f2ede6] leading-tight mb-2"
              style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
            >
              India&apos;s financial news, delivered daily.
            </h3>
            <p className="text-[#7c7888] text-[12px] mb-6">
              Finance, markets, economy and startup updates — straight to your inbox.
            </p>
            <Link
              href="/news/subscribe"
              className="inline-block text-[10px] font-black uppercase tracking-[0.18em] px-6 py-3 transition-opacity hover:opacity-80"
              style={{ backgroundColor: accent, color: "#070708" }}
            >
              Subscribe Free →
            </Link>
          </div>

          {/* ── Back link ───────────────────────────────────────────── */}
          <div className="flex items-center pt-4 mb-10" style={{ borderTop: "1px solid #1e1e24" }}>
            <Link
              href="/news"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
              style={{ color: "#7c7888" }}
            >
              ← All News
            </Link>
          </div>
        </div>

        {/* ── Related Articles ─────────────────────────────────────────── */}
        {related.length > 0 && (
          <div
            className="max-w-3xl mx-auto px-4 sm:px-6 pb-20"
            style={{ borderTop: "1px solid #1e1e24" }}
          >
            <div className="flex items-center gap-4 py-6">
              <span
                className="text-[9px] font-black uppercase tracking-[0.22em]"
                style={{ color: accent }}
              >
                More {categoryLabel} News
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "#1e1e24" }} />
            </div>

            <div className="space-y-0">
              {related.map((rel: RelatedArticle, i: number) => {
                const relOptimized = proxyNewsImage(rel.image_url);
                const relAgo = (() => {
                  const diff = Date.now() - new Date(rel.published_at).getTime();
                  const h = Math.floor(diff / 3_600_000);
                  const m = Math.floor(diff / 60_000);
                  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
                  if (h >= 1) return `${h}h ago`;
                  return `${m}m ago`;
                })();

                return (
                  <Link
                    key={rel.id}
                    href={`/news/${rel.slug}`}
                    className="group flex items-start gap-4 py-5"
                    style={{
                      borderBottom: i < related.length - 1 ? "1px solid #1e1e24" : "none",
                    }}
                  >
                    {relOptimized && (
                      <div
                        className="relative shrink-0 overflow-hidden"
                        style={{ width: "100px", height: "70px" }}
                      >
                        <Image
                          src={relOptimized}
                          alt={rel.image_alt ?? rel.headline}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                          sizes="100px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-[#d4cfc7] text-[0.95rem] leading-snug line-clamp-2 group-hover:text-white transition-colors mb-2"
                        style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
                      >
                        {rel.headline}
                      </h4>
                      <span className="text-[#7c7888] text-[10px]">{relAgo}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { proxyNewsImage } from "@/lib/image-proxy";

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
      images: [
        {
          url: image,
          alt: article.image_alt ?? article.headline,
          width: 1200,
          height: 630,
        },
      ],
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

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();

  const canonicalUrl = `https://rizzjobs.in/news/${article.slug}`;
  const publishedDate = new Date(article.published_at).toISOString();
  const modifiedDate = new Date(article.updated_at ?? article.published_at).toISOString();
  const image = article.image_url ?? "https://rizzjobs.in/og-image.png";
  const categoryLabel = article.category.charAt(0).toUpperCase() + article.category.slice(1);
  const accent = CATEGORY_ACCENT[article.category] ?? CATEGORY_ACCENT.finance;
  const optimizedSrc = proxyNewsImage(article.image_url);

  const formattedDate = new Date(article.published_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Schema 1: NewsArticle ──
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

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: article.headline,
    isPartOf: { "@id": "https://rizzjobs.in/#website" },
    primaryImageOfPage: { "@type": "ImageObject", url: image },
    datePublished: publishedDate,
    dateModified: modifiedDate,
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    image: [image],
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: { "@type": "Organization", name: "Rizz Jobs" },
  };

  const paragraphs = article.content.split("\n\n").filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>

        {/* ── Hero Image ───────────────────────────────────────────────── */}
        <div className="relative w-full" style={{ height: "clamp(280px, 48vw, 520px)" }}>
          {optimizedSrc ? (
            <Image
              src={optimizedSrc}
              alt={article.image_alt ?? article.headline}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, #0d0d18 0%, #141420 100%)` }}
            />
          )}
          {/* Cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/60 to-[#070708]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070708]/50 to-transparent" />

          {/* Category badge over image */}
          <div className="absolute top-6 left-6">
            <span
              className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 text-black"
              style={{ backgroundColor: accent }}
            >
              {article.category}
            </span>
          </div>
        </div>

        {/* ── Article Content ───────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ marginTop: "-80px", position: "relative", zIndex: 10 }}>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6" aria-label="Breadcrumb">
            <Link
              href="/news"
              className="text-[10px] uppercase tracking-[0.16em] font-bold transition-colors duration-150"
              style={{ color: "#52505e" }}
            >
              News
            </Link>
            <span style={{ color: "#2a2838" }} className="text-[10px]">›</span>
            <Link
              href={`/news/${article.category}`}
              className="text-[10px] uppercase tracking-[0.16em] font-bold transition-colors duration-150"
              style={{ color: "#52505e" }}
            >
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

          {/* Summary / deck */}
          <p
            className="text-[#8a8799] leading-relaxed mb-7"
            style={{ fontSize: "1.05rem", borderLeft: `3px solid ${accent}`, paddingLeft: "1rem" }}
          >
            {article.summary}
          </p>

          {/* Byline */}
          <div
            className="flex items-center flex-wrap gap-x-4 gap-y-1 py-4 mb-8"
            style={{ borderTop: "1px solid #1e1e24", borderBottom: "1px solid #1e1e24" }}
          >
            <span className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>
              Rizz Jobs News Desk
            </span>
            <span style={{ color: "#2a2838" }}>·</span>
            <time
              dateTime={article.published_at}
              className="text-[#52505e] text-[11px] uppercase tracking-wide"
            >
              {formattedDate}
            </time>
            <span style={{ color: "#2a2838" }}>·</span>
            <span className="text-[#52505e] text-[11px]">
              Source:{" "}
              <a
                href={article.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150"
                style={{ color: accent }}
              >
                {article.source_name} ↗
              </a>
            </span>
          </div>

          {/* Article Body */}
          <article className="mb-12">
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="leading-[1.85] mb-5"
                style={{
                  color: i === 0 ? "#d4cfc7" : "#9a9699",
                  fontSize: i === 0 ? "1.05rem" : "0.975rem",
                  ...(i === 0
                    ? {
                        fontFamily: "'DM Serif Display', 'Georgia', serif",
                        fontWeight: 400,
                        fontSize: "1.15rem",
                        lineHeight: "1.7",
                        color: "#d4cfc7",
                      }
                    : {}),
                }}
              >
                {paragraph}
              </p>
            ))}
          </article>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-10">
              <p
                className="text-[9px] font-black uppercase tracking-[0.22em] mb-3"
                style={{ color: "#3a3848" }}
              >
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-[0.1em] font-bold px-3 py-1"
                    style={{
                      color: "#52505e",
                      border: "1px solid #1e1e24",
                      backgroundColor: "#0d0d10",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer divider + back link */}
          <div
            className="flex items-center justify-between py-6 mb-16"
            style={{ borderTop: "1px solid #1e1e24" }}
          >
            <Link
              href="/news"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors duration-200"
              style={{ color: "#52505e" }}
            >
              ← All News
            </Link>
            <a
              href={article.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] px-4 py-2 transition-colors duration-200"
              style={{
                color: "#070708",
                backgroundColor: accent,
              }}
            >
              Read on {article.source_name} ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

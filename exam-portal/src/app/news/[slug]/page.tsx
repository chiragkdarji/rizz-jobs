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
  const modifiedDate = new Date(
    article.updated_at ?? article.published_at
  ).toISOString();
  const image = article.image_url ?? "https://rizzjobs.in/og-image.png";
  const categoryLabel =
    article.category.charAt(0).toUpperCase() + article.category.slice(1);

  // ── Schema 1: NewsArticle (required for Google News) ──
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
    author: {
      "@type": "Organization",
      name: "Rizz Jobs News Desk",
      url: "https://rizzjobs.in",
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": "https://rizzjobs.in/#newsmediaorganization",
      name: "Rizz Jobs",
      logo: {
        "@type": "ImageObject",
        url: "https://rizzjobs.in/logo.png",
        width: 512,
        height: 512,
      },
    },
    image: {
      "@type": "ImageObject",
      url: image,
      width: 1200,
      height: 630,
    },
    keywords: (article.tags ?? []).join(", "),
    articleSection: categoryLabel,
    inLanguage: "en-IN",
  };

  // ── Schema 2: BreadcrumbList ──
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
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabel,
        item: `https://rizzjobs.in/news/${article.category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.headline,
      },
    ],
  };

  // ── Schema 3: WebPage ──
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

  // ── Schema 4: Article (Google Discover multi-image signal) ──
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    image: [image],
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: { "@type": "Organization", name: "Rizz Jobs" },
  };

  const formattedDate = new Date(article.published_at).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-3xl mx-auto">
        {/* Breadcrumb nav */}
        <nav className="text-xs text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/news" className="hover:text-white transition-colors">
            News
          </Link>
          <span>/</span>
          <Link
            href={`/news/${article.category}`}
            className="hover:text-white transition-colors capitalize"
          >
            {article.category}
          </Link>
        </nav>

        {/* Category badge */}
        <span className="inline-block bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded mb-4">
          {article.category}
        </span>

        <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-4">
          {article.headline}
        </h1>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
          <span>By Rizz Jobs News Desk</span>
          <span>·</span>
          <time dateTime={article.published_at}>{formattedDate}</time>
          <span>·</span>
          <span>
            Source:{" "}
            <a
              href={article.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              {article.source_name}
            </a>
          </span>
        </div>

        {proxyNewsImage(article.image_url) && (
          <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden mb-8 bg-gray-800">
            <Image
              src={proxyNewsImage(article.image_url)!}
              alt={article.image_alt ?? article.headline}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Article body */}
        <div className="space-y-4 text-gray-300 leading-relaxed text-sm sm:text-base">
          {article.content.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-3">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-800">
          <Link
            href="/news"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
          >
            ← Back to News
          </Link>
        </div>
      </article>
    </>
  );
}

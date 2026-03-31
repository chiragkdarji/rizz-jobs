"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { proxyNewsImage } from "@/lib/image-proxy";
import { removeNewsBookmark } from "@/components/NewsBookmarkButton";

interface SavedArticle {
  slug: string;
  headline: string;
  category: string;
  published_at: string;
  image_url?: string | null;
}

const CATEGORY_ACCENT: Record<string, string> = {
  finance:  "#3b82f6",
  business: "#a855f7",
  markets:  "#22c55e",
  economy:  "#f59e0b",
  startups: "#f43f5e",
};

export default function SavedPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("news_bookmarks") ?? "[]");
      setArticles(raw);
    } catch {
      setArticles([]);
    }
    setLoaded(true);
  }, []);

  const remove = (slug: string) => {
    removeNewsBookmark(slug);
    setArticles((prev) => prev.filter((a) => a.slug !== slug));
  };

  if (!loaded) return null;

  return (
    <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">

        <div
          className="flex items-end justify-between gap-4 pb-6 mb-2"
          style={{ borderBottom: "1px solid #1e1e24" }}
        >
          <h1
            className="text-[clamp(1.4rem,4vw,2rem)] text-[#f2ede6] leading-none"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            Saved Articles
          </h1>
          {articles.length > 0 && (
            <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#7c7888" }}>
              {articles.length} saved
            </span>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div
              className="w-12 h-12 mb-6 flex items-center justify-center"
              style={{ border: "1px solid #1e1e24" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0a500" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-[#7c7888] text-sm uppercase tracking-widest font-bold mb-2">No saved articles</p>
            <p className="text-[#7c7888] text-xs mb-8">
              Tap Save on any article to read it later.
            </p>
            <Link
              href="/news"
              className="text-[11px] font-black uppercase tracking-[0.18em] px-6 py-3"
              style={{ backgroundColor: "#f0a500", color: "#070708" }}
            >
              Browse News →
            </Link>
          </div>
        ) : (
          <div>
            {articles.map((article, i) => {
              const accent = CATEGORY_ACCENT[article.category] ?? CATEGORY_ACCENT.finance;
              const optimized = proxyNewsImage(article.image_url);
              const date = new Date(article.published_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <div
                  key={article.slug}
                  className="flex items-start gap-4 py-5"
                  style={{ borderBottom: i < articles.length - 1 ? "1px solid #1e1e24" : "none" }}
                >
                  {optimized && (
                    <Link href={`/news/${article.slug}`} className="relative shrink-0 overflow-hidden block" style={{ width: "96px", height: "72px" }}>
                      <Image src={optimized} alt={article.headline} fill className="object-cover" sizes="96px" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>
                        {article.category}
                      </span>
                      <span className="text-[#7c7888] text-[12px]">·</span>
                      <span className="text-[#7c7888] text-[12px]">{date}</span>
                    </div>
                    <Link href={`/news/${article.slug}`}>
                      <h3
                        className="text-[#e8e4dc] text-[1rem] leading-snug line-clamp-2 hover:text-white transition-colors"
                        style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
                      >
                        {article.headline}
                      </h3>
                    </Link>
                  </div>
                  <button
                    onClick={() => remove(article.slug)}
                    aria-label="Remove bookmark"
                    title="Remove"
                    className="shrink-0 mt-1"
                    style={{ color: "#2a2838", transition: "color 0.15s", cursor: "pointer", background: "none", border: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2838")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

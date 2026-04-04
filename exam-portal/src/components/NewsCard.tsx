import Image from "next/image";
import Link from "next/link";
import { proxyNewsImage } from "@/lib/image-proxy";
import { estimateReadTimeFromSummary } from "@/lib/read-time";

export type NewsCardVariant = "hero" | "featured" | "compact";

interface NewsCardProps {
  slug: string;
  headline: string;
  summary: string;
  category: string;
  source_name?: string;
  published_at: string;
  image_url?: string | null;
  image_alt?: string | null;
  variant?: NewsCardVariant;
}

const CATEGORY_ACCENT: Record<string, string> = {
  finance:  "#3b82f6",
  business: "#a855f7",
  markets:  "#22c55e",
  economy:  "#f59e0b",
  startups: "#f43f5e",
  ipl:      "#06b6d4",
};

// WCAG AA compliant muted text on #070708 / #0d0d10
const MUTED = "#9898aa";

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return "just now";
}

export default function NewsCard({
  slug,
  headline,
  summary,
  category,
  published_at,
  image_url,
  image_alt,
  variant = "compact",
}: NewsCardProps) {
  const accent = CATEGORY_ACCENT[category] ?? CATEGORY_ACCENT.finance;
  const optimizedSrc = proxyNewsImage(image_url);
  const ago = timeAgo(published_at);
  const readTime = estimateReadTimeFromSummary(summary);

  // ── HERO ──────────────────────────────────────────────────────────────────
  if (variant === "hero") {
    return (
      <Link
        href={`/news/${slug}`}
        className="group relative block w-full overflow-hidden"
        style={{ height: "clamp(240px, 52vw, 520px)" }}
      >
        {optimizedSrc ? (
          <Image
            src={optimizedSrc}
            alt={image_alt ?? headline}
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, #0d0d18 0%, #141420 100%)` }}
          />
        )}

        {/* Layered gradients for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        {/* Content anchored to bottom */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-[11px] font-bold uppercase text-black"
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                backgroundColor: accent,
                letterSpacing: "0.10em",
                padding: "3px 10px",
              }}
            >
              {category}
            </span>
            <span style={{ color: "#c0c0cc", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
              {ago}
            </span>
          </div>

          <h2
            className="text-white leading-[1.12] mb-3 max-w-4xl group-hover:text-amber-50 transition-colors duration-300"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: "clamp(1.35rem, 3.5vw, 2.6rem)",
              fontWeight: 400,
            }}
          >
            {headline}
          </h2>

          <p
            className="leading-relaxed max-w-2xl line-clamp-2 hidden sm:block"
            style={{ color: "#b8b8c8", fontSize: "14px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}
          >
            {summary}
          </p>

          <div
            className="mt-4 inline-flex items-center gap-2 font-semibold uppercase"
            style={{
              color: accent,
              fontSize: "12px",
              letterSpacing: "0.12em",
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
            }}
          >
            <span>Read Full Story</span>
            <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
          </div>
        </div>
      </Link>
    );
  }

  // ── FEATURED ──────────────────────────────────────────────────────────────
  // Image on top, all text cleanly below — no overlap.
  if (variant === "featured") {
    return (
      <Link href={`/news/${slug}`} className="group flex flex-col h-full" style={{ backgroundColor: "#0d0d10" }}>

        {/* Image */}
        <div className="relative overflow-hidden shrink-0" style={{ aspectRatio: "16/9" }}>
          {optimizedSrc ? (
            <>
              <Image
                src={optimizedSrc}
                alt={image_alt ?? headline}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${accent}18 0%, #0d0d10 100%)` }}
            />
          )}
          {/* Category pill — top-left, doesn't overlap text */}
          <span
            className="absolute top-3 left-3 text-black font-bold uppercase"
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              backgroundColor: accent,
              padding: "3px 9px",
            }}
          >
            {category}
          </span>
        </div>

        {/* Accent rule */}
        <div style={{ height: "2px", backgroundColor: accent, flexShrink: 0 }} />

        {/* Text — completely separate from image */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h3
            className="text-[#f0ece6] leading-snug line-clamp-3 group-hover:text-white transition-colors duration-200"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: "1.05rem",
              fontWeight: 400,
              lineHeight: 1.35,
            }}
          >
            {headline}
          </h3>

          <p
            className="line-clamp-2 mt-1"
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "13px",
              lineHeight: 1.55,
              color: MUTED,
            }}
          >
            {summary}
          </p>

          <div
            className="mt-auto pt-3 flex items-center gap-2"
            style={{ borderTop: "1px solid #1e1e26" }}
          >
            <span style={{ color: MUTED, fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
              {ago}
            </span>
            <span style={{ color: "#333340" }}>·</span>
            <span style={{ color: MUTED, fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
              {readTime} min read
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // ── COMPACT ───────────────────────────────────────────────────────────────
  return (
    <Link
      href={`/news/${slug}`}
      className="group flex items-start gap-4 py-5"
      style={{ borderBottom: "1px solid #1e1e26" }}
    >
      {optimizedSrc && (
        <div className="relative shrink-0 overflow-hidden" style={{ width: "100px", height: "72px" }}>
          <Image
            src={optimizedSrc}
            alt={image_alt ?? headline}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.07]"
            sizes="100px"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-semibold uppercase"
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: accent,
            }}
          >
            {category}
          </span>
          <span style={{ color: "#333340", fontSize: "10px" }}>·</span>
          <span style={{ color: MUTED, fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
            {ago}
          </span>
          <span style={{ color: "#333340", fontSize: "10px" }}>·</span>
          <span style={{ color: MUTED, fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
            {readTime} min
          </span>
        </div>

        <h3
          className="text-[#e8e4dc] leading-snug line-clamp-2 group-hover:text-white transition-colors duration-200"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "1rem",
            fontWeight: 400,
          }}
        >
          {headline}
        </h3>
      </div>
    </Link>
  );
}

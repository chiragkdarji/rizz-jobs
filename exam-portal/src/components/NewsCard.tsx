import Image from "next/image";
import Link from "next/link";
import { proxyNewsImage } from "@/lib/image-proxy";

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
};

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
  source_name,
  published_at,
  image_url,
  image_alt,
  variant = "compact",
}: NewsCardProps) {
  const accent = CATEGORY_ACCENT[category] ?? CATEGORY_ACCENT.finance;
  const optimizedSrc = proxyNewsImage(image_url);
  const ago = timeAgo(published_at);

  // ── HERO ──────────────────────────────────────────────────────────────────
  if (variant === "hero") {
    return (
      <Link
        href={`/news/${slug}`}
        className="group relative block w-full overflow-hidden"
        style={{ height: "clamp(320px, 52vw, 520px)" }}
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
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 text-black"
              style={{ backgroundColor: accent }}
            >
              {category}
            </span>
            <span className="text-gray-400 text-xs tracking-wide">{ago}</span>
            <span className="text-gray-600 text-xs ml-auto hidden sm:block">Rizz Jobs</span>
          </div>

          <h2
            className="text-[clamp(1.5rem,3.5vw,2.6rem)] text-white leading-[1.15] mb-3 max-w-4xl group-hover:text-amber-50 transition-colors duration-300"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            {headline}
          </h2>

          <p className="text-gray-300 text-sm leading-relaxed max-w-2xl line-clamp-2 hidden sm:block">
            {summary}
          </p>

          <div
            className="mt-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase"
            style={{ color: accent }}
          >
            <span>Read Full Story</span>
            <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
          </div>
        </div>
      </Link>
    );
  }

  // ── FEATURED ──────────────────────────────────────────────────────────────
  if (variant === "featured") {
    return (
      <Link href={`/news/${slug}`} className="group flex flex-col h-full">
        {/* Image */}
        <div className="relative overflow-hidden shrink-0" style={{ height: "190px" }}>
          {optimizedSrc ? (
            <>
              <Image
                src={optimizedSrc}
                alt={image_alt ?? headline}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-300" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${accent}22 0%, #0d0d10 100%)`,
              }}
            />
          )}
          <span
            className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 text-black"
            style={{ backgroundColor: accent }}
          >
            {category}
          </span>
        </div>

        {/* Accent line */}
        <div style={{ height: "2px", backgroundColor: accent }} />

        {/* Body */}
        <div className="flex flex-col flex-1 pt-4 pb-4" style={{ backgroundColor: "#0d0d10" }}>
          <h3
            className="text-[#f2ede6] text-[1.05rem] leading-snug line-clamp-3 group-hover:text-white transition-colors duration-200 mb-2"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            {headline}
          </h3>
          <p className="text-[#7a7886] text-[11.5px] leading-relaxed line-clamp-2 mb-auto">
            {summary}
          </p>
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: "1px solid #1e1e24" }}
          >
            <span className="text-[#52505e] text-[10px] uppercase tracking-wide">Rizz Jobs</span>
            <span className="text-[#52505e] text-[10px]">{ago}</span>
          </div>
        </div>
      </Link>
    );
  }

  // ── COMPACT (default) ─────────────────────────────────────────────────────
  return (
    <Link
      href={`/news/${slug}`}
      className="group flex items-start gap-4 py-4"
      style={{ borderBottom: "1px solid #1e1e24" }}
    >
      {optimizedSrc && (
        <div className="relative shrink-0 overflow-hidden" style={{ width: "90px", height: "66px" }}>
          <Image
            src={optimizedSrc}
            alt={image_alt ?? headline}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.07]"
            sizes="90px"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[9px] font-black uppercase tracking-[0.16em]"
            style={{ color: accent }}
          >
            {category}
          </span>
          <span className="text-[#3a3848] text-[10px]">·</span>
          <span className="text-[#52505e] text-[10px]">{ago}</span>
        </div>
        <h3
          className="text-[#e8e4dc] text-[0.95rem] leading-snug line-clamp-2 group-hover:text-white transition-colors duration-200"
          style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
        >
          {headline}
        </h3>
        <span className="text-[#454354] text-[10px] mt-1.5 uppercase tracking-wide">Rizz Jobs</span>
      </div>
    </Link>
  );
}

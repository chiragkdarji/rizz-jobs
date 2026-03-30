import Image from "next/image";
import Link from "next/link";

interface NewsCardProps {
  slug: string;
  headline: string;
  summary: string;
  category: string;
  source_name: string;
  published_at: string;
  image_url?: string | null;
  image_alt?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  finance: "bg-blue-900/40 text-blue-300 border border-blue-700/30",
  business: "bg-purple-900/40 text-purple-300 border border-purple-700/30",
  markets: "bg-green-900/40 text-green-300 border border-green-700/30",
  economy: "bg-amber-900/40 text-amber-300 border border-amber-700/30",
  startups: "bg-rose-900/40 text-rose-300 border border-rose-700/30",
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
}: NewsCardProps) {
  const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.finance;

  return (
    <Link
      href={`/news/${slug}`}
      className="group flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-200"
    >
      {image_url && (
        <div className="relative h-44 w-full overflow-hidden bg-gray-800 shrink-0">
          <Image
            src={image_url}
            alt={image_alt ?? headline}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colorClass}`}>
            {category}
          </span>
          <span className="text-xs text-gray-500 truncate">{source_name}</span>
          <span className="text-xs text-gray-600 ml-auto shrink-0">{timeAgo(published_at)}</span>
        </div>
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-3 group-hover:text-indigo-400 transition-colors">
          {headline}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{summary}</p>
      </div>
    </Link>
  );
}

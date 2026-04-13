import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Cricket News – Latest Updates | CricScore",
  description:
    "Latest cricket news, match reports, player updates and series previews from around the world.",
};

interface NewsStory {
  id: number;
  hline?: string;
  headline?: string;
  intro?: string;
  imageId?: number;
  pubTime?: string | number;
  seo?: string;
}

async function getNews(): Promise<NewsStory[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
    const res = await fetch(`${base}/api/cricket/news`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { storyList?: { story?: NewsStory }[] };
    return (data.storyList ?? [])
      .filter((n) => n.story)
      .map((n) => n.story as NewsStory);
  } catch {
    return [];
  }
}

export default async function CricketNewsPage() {
  const stories = await getNews();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}
      >
        Cricket News
      </h1>
      <p className="text-sm mb-8" style={{ color: "#5A566A" }}>
        Latest updates · Match reports · Series news
      </p>

      {stories.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          No news available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((n) => {
            const pubMs = n.pubTime ? Number(n.pubTime) : 0;
            const pubDate =
              pubMs > 0
                ? new Date(pubMs).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";

            return (
              <Link key={n.id} href={`/ipl/news/${n.id}`}>
                <div
                  className="rounded-xl overflow-hidden h-full flex flex-col transition-all hover:border-[#FFB800]"
                  style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
                >
                  {n.imageId ? (
                    <div className="relative w-full h-40 shrink-0">
                      <Image
                        src={`/api/ipl/image?id=${n.imageId}&type=news`}
                        alt={(n.hline ?? n.headline ?? "") as string}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full h-32 shrink-0 flex items-center justify-center text-2xl"
                      style={{ background: "#1A1A26" }}
                    >
                      🏏
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <p className="text-sm font-semibold leading-snug line-clamp-3" style={{ color: "#F0EDE8" }}>
                      {(n.hline ?? n.headline) as string}
                    </p>
                    {n.intro && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#5A566A" }}>
                        {n.intro}
                      </p>
                    )}
                    {pubDate && (
                      <p className="text-xs mt-auto pt-1" style={{ color: "#5A566A" }}>
                        {pubDate}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

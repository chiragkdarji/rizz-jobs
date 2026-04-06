import type { Metadata } from "next";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "IPL 2026 News | Rizz Jobs",
  description: "Latest IPL 2026 news, match updates, and player stories from Cricbuzz.",
};

export default async function IplNewsPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let newsItems: { id: number; headline: string; intro?: string; coverImage?: { id: number }; publishTime?: number }[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/news`, { next: { revalidate: 900 } });
    if (res.ok) {
      const data = await res.json();
      // news/v1/series/{id} returns { storyList: [{ story: { id, headline, intro, coverImage, publishTime } }, ...] }
      newsItems = (data?.storyList ?? [])
        .filter((n: { story?: unknown }) => n.story)
        .map((n: { story: { id: number; headline: string; intro?: string; coverImage?: { id: number }; publishTime?: number } }) => n.story);
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2026 News
      </h1>
      {newsItems.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B86A0" }}>No news available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {newsItems.map((n) => (
            <IplNewsCard
              key={n.id}
              id={n.id}
              headline={n.headline}
              intro={n.intro}
              imageId={n.coverImage?.id}
              publishTime={n.publishTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "IPL 2025 News | Rizz Jobs",
  description: "Latest IPL 2025 news, match updates, and player stories from Cricbuzz.",
};

export default async function IplNewsPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let newsItems: { id: number; hline: string; intro?: string; imageId?: number; pubTime?: number }[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/news`, { next: { revalidate: 900 } });
    if (res.ok) {
      const data = await res.json();
      newsItems = (data?.storyList ?? [])
        .filter((n: { story?: unknown }) => n.story)
        .map((n: { story: { id: number; hline: string; intro?: string; imageId?: number; pubTime?: number } }) => n.story);
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2025 News
      </h1>
      {newsItems.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B86A0" }}>No news available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {newsItems.map((n) => (
            <IplNewsCard
              key={n.id}
              id={n.id}
              headline={n.hline}
              intro={n.intro}
              imageId={n.imageId}
              publishTime={n.pubTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

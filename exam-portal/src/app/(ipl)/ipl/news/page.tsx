import type { Metadata } from "next";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "IPL 2026 News | Rizz Jobs",
  description: "Latest IPL 2026 news, match updates, and player stories from Cricbuzz.",
};

export default async function IplNewsPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let newsItems: Record<string, unknown>[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/news`, { next: { revalidate: 900 } });
    if (res.ok) {
      const data = await res.json();
      // Cricbuzz story fields: id, hline (headline), intro, imageId (number), pubTime (ms)
      newsItems = (data?.storyList ?? [])
        .filter((n: { story?: unknown }) => n.story)
        .map((n: { story: Record<string, unknown> }) => n.story);
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2026 News
      </h1>
      {newsItems.length === 0 ? (
        <p className="text-sm" style={{ color: "#5A566A" }}>No news available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {newsItems.map((n) => (
            <IplNewsCard
              key={n.id as number}
              id={n.id as number}
              headline={(n.hline ?? n.headline ?? "") as string}
              intro={n.intro as string | undefined}
              imageId={n.imageId as number | undefined}
              publishTime={n.pubTime ? Number(n.pubTime) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

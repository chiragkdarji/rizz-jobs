import type { Metadata } from "next";

export const revalidate = 3600;

interface Props {
  params: Promise<{ newsId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/news/${newsId}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const story = data?.appIndex?.seoTitle ?? data?.header?.headline ?? "IPL News";
      return { title: `${story} | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "IPL News | Rizz Jobs" };
}

export default async function NewsDetailPage({ params }: Props) {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let article: {
    header?: { headline?: string; intro?: string };
    content?: { contentType?: string; contentValue?: string }[];
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/news/${newsId}`, { next: { revalidate: 3600 } });
    if (res.ok) article = await res.json();
  } catch {/* silently handle */}

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#6B86A0" }}>Article not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        {article.header?.headline}
      </h1>
      {article.header?.intro && (
        <p className="text-base mb-6 leading-relaxed" style={{ color: "#6B86A0" }}>
          {article.header.intro}
        </p>
      )}
      <div className="space-y-4">
        {(article.content ?? []).map((block, i) => {
          if (block.contentType === "text") {
            return (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#E8E4DC" }}>
                {block.contentValue}
              </p>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

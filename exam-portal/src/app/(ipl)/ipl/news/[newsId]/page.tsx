import type { Metadata } from "next";
import Image from "next/image";

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
      const title = data?.headline ?? "IPL News";
      return { title: `${title} | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "IPL News | Rizz Jobs" };
}

/** Strip Cricbuzz inline format markers like @B0$, @L0$, @I0$ from text. */
function stripMarkers(text: string): string {
  return text.replace(/@[A-Z]\d+\$/g, "").trim();
}

export default async function NewsDetailPage({ params }: Props) {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let article: {
    headline?: string;
    intro?: string;
    coverImage?: { id?: number | string };
    publishTime?: number | string;
    lastUpdatedTime?: number | string;
    // Actual Cricbuzz structure: content[i] = { content: { contentType, contentValue } } | { ad: {...} }
    content?: Array<{
      content?: { contentType?: string; contentValue?: string; imageId?: number | string; caption?: string };
      ad?: unknown;
    }>;
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/news/${newsId}`, { next: { revalidate: 3600 } });
    if (res.ok) article = await res.json();
  } catch {/* silently handle */}

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#5A566A" }}>Article not found.</p>
      </div>
    );
  }

  // publishTime comes as a string of epoch ms — Number() before new Date()
  const publishDate = article.publishTime
    ? new Date(Number(article.publishTime)).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
      })
    : null;

  // Filter out ad blocks; keep only .content nodes
  const contentBlocks = (article.content ?? [])
    .map((item) => item.content)
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Cover image — use thumb for good quality at full-width display */}
      {article.coverImage?.id && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-[#2A2A3A]">
          <Image
            src={`/api/ipl/image?id=${article.coverImage.id}&p=thumb`}
            alt={article.headline ?? ""}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Title */}
      <h1
        className="text-2xl md:text-3xl font-bold mb-3 leading-tight"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        {article.headline}
      </h1>

      {publishDate && (
        <p className="text-xs mb-5" style={{ color: "#5A566A" }}>{publishDate}</p>
      )}

      {/* Intro / lede */}
      {article.intro && (
        <p
          className="text-base mb-6 leading-relaxed font-semibold"
          style={{ color: "#9A96A0", borderLeft: "3px solid #FFB800", paddingLeft: "1rem" }}
        >
          {article.intro}
        </p>
      )}

      {/* Article body */}
      <div className="space-y-4">
        {contentBlocks.map((block, i) => {
          const type = (block.contentType ?? "").toLowerCase();
          const value = block.contentValue ?? "";

          if (type === "text" || type === "para" || type === "paragraph" || type === "p") {
            const text = stripMarkers(value);
            if (!text) return null;
            return (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#F0EDE8" }}>
                {text}
              </p>
            );
          }

          if (type === "h2" || type === "heading" || type === "subheading") {
            return (
              <h2
                key={i}
                className="text-lg font-bold mt-6"
                style={{ color: "#FFB800", fontFamily: "var(--font-ipl-display, sans-serif)" }}
              >
                {stripMarkers(value)}
              </h2>
            );
          }

          if (type === "img" || type === "image") {
            const imgId = block.imageId ?? value;
            if (imgId && /^\d+$/.test(String(imgId))) {
              return (
                <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#2A2A3A]">
                  <Image
                    src={`/api/ipl/image?id=${imgId}&p=thumb`}
                    alt={block.caption ?? ""}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {block.caption && (
                    <p className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-xs" style={{ background: "#00000088", color: "#F0EDE8" }}>
                      {block.caption}
                    </p>
                  )}
                </div>
              );
            }
          }

          // Unknown block with text content — render as paragraph
          if (value && isNaN(Number(value)) && !type.includes("img") && !type.includes("image")) {
            const text = stripMarkers(value);
            if (text) return (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#F0EDE8" }}>{text}</p>
            );
          }

          return null;
        })}

        {contentBlocks.length === 0 && (
          <p className="text-sm" style={{ color: "#5A566A" }}>Full content not available.</p>
        )}
      </div>
    </div>
  );
}

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

interface ContentBlock {
  contentType?: string;
  contentValue?: string;
  imageId?: number | string;
  caption?: string;
}

export default async function NewsDetailPage({ params }: Props) {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let article: {
    headline?: string;
    intro?: string;
    coverImage?: { id?: number };
    publishTime?: number;
    content?: ContentBlock[];
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

  const publishDate = article.publishTime
    ? new Date(article.publishTime).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Cover image */}
      {article.coverImage?.id && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-[#0E2235]">
          <Image
            src={`/api/ipl/image?id=${article.coverImage.id}&type=news`}
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
        style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        {article.headline}
      </h1>

      {publishDate && (
        <p className="text-xs mb-4" style={{ color: "#6B86A0" }}>{publishDate}</p>
      )}

      {/* Intro */}
      {article.intro && (
        <p
          className="text-base mb-6 leading-relaxed font-semibold"
          style={{ color: "#8BB0C8", borderLeft: "3px solid #D4AF37", paddingLeft: "1rem" }}
        >
          {article.intro}
        </p>
      )}

      {/* Content blocks */}
      <div className="space-y-4">
        {(article.content ?? []).map((block, i) => {
          const type = (block.contentType ?? "").toLowerCase();

          // Text / paragraph blocks
          if (
            type === "text" ||
            type === "para" ||
            type === "p" ||
            type === "paragraph" ||
            // Fallback: any block with a non-numeric contentValue
            (block.contentValue && isNaN(Number(block.contentValue)) && !type.includes("img") && !type.includes("image"))
          ) {
            return (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#E8E4DC" }}>
                {block.contentValue}
              </p>
            );
          }

          // Heading blocks
          if (type === "h2" || type === "heading" || type === "subheading") {
            return (
              <h2
                key={i}
                className="text-lg font-bold mt-4"
                style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-display, sans-serif)" }}
              >
                {block.contentValue}
              </h2>
            );
          }

          // Inline image blocks
          if (type === "img" || type === "image") {
            const imgId = block.imageId ?? block.contentValue;
            if (imgId && /^\d+$/.test(String(imgId))) {
              return (
                <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#0E2235]">
                  <Image
                    src={`/api/ipl/image?id=${imgId}&type=news`}
                    alt={block.caption ?? ""}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {block.caption && (
                    <p className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-xs" style={{ background: "#00000088", color: "#E8E4DC" }}>
                      {block.caption}
                    </p>
                  )}
                </div>
              );
            }
          }

          return null;
        })}

        {/* Fallback: if no content rendered, show "Full story on Cricbuzz" */}
        {(article.content ?? []).length === 0 && (
          <p className="text-sm" style={{ color: "#6B86A0" }}>
            Full article content not available in this view.
          </p>
        )}
      </div>
    </div>
  );
}

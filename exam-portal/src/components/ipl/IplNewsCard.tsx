import Link from "next/link";
import Image from "next/image";

interface Props {
  id: number | string;
  headline: string;
  intro?: string;
  imageId?: number;
  publishTime?: number; // ms
}

export default function IplNewsCard({ id, headline, intro, imageId, publishTime }: Props) {
  const date = publishTime ? new Date(publishTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";

  return (
    <Link href={`/ipl/news/${id}`}>
      <article
        className="rounded-lg overflow-hidden transition-colors cursor-pointer h-full flex flex-col"
        style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
      >
        {imageId && (
          <div className="relative w-full aspect-video bg-[#2A2A3A]">
            <Image
              src={`/api/ipl/image?id=${imageId}&type=news`}
              alt={headline}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <h3
            className="font-bold text-base leading-snug line-clamp-3 flex-1"
            style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            {headline}
          </h3>
          {intro && (
            <p className="text-sm mt-2 line-clamp-2" style={{ color: "#5A566A" }}>
              {intro}
            </p>
          )}
          {date && (
            <p className="text-xs mt-3" style={{ color: "#5A566A" }}>
              {date}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

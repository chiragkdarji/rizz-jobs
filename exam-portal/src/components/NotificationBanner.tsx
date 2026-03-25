"use client";

import { useState } from "react";

interface NotificationBannerProps {
  imageUrl?: string | null;
  title: string;
  alt?: string;
}

function BannerPlaceholder({ title }: { title: string }) {
  const displayTitle = title.length > 52 ? title.slice(0, 50) + "…" : title;

  return (
    <div
      className="w-full h-full flex items-center justify-center px-8"
      style={{
        background: "linear-gradient(to right, hsl(216deg 71.43% 13.73%), hsl(274.29deg 40.58% 27.06%))",
      }}
      aria-label={title}
    >
      <p className="text-white font-bold text-sm md:text-base leading-snug text-center line-clamp-2 drop-shadow">
        {displayTitle}
      </p>
    </div>
  );
}

export function NotificationBanner({
  imageUrl,
  title,
  alt,
}: NotificationBannerProps) {
  const [imgError, setImgError] = useState(false);

  const showImage = imageUrl && !imgError;

  return (
    <div className="mb-4 rounded-xl overflow-hidden h-40 bg-white/5 border border-white/5">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt || title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <BannerPlaceholder title={title} />
      )}
    </div>
  );
}

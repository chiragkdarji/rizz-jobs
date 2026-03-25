"use client";

import { useState } from "react";

interface NotificationBannerProps {
  imageUrl?: string | null;
  title: string;
  alt?: string;
  /** "card" — fixed h-40 for listing cards (default)
   *  "hero" — aspect-video for detail page hero */
  variant?: "card" | "hero";
  caption?: string;
  description?: string;
}

const PLACEHOLDER_STYLE = {
  background:
    "linear-gradient(to right, hsl(216deg 71.43% 13.73%), hsl(274.29deg 40.58% 27.06%))",
};

function BannerPlaceholder({
  title,
  variant,
}: {
  title: string;
  variant: "card" | "hero";
}) {
  const displayTitle = title.length > 60 ? title.slice(0, 58) + "…" : title;

  return (
    <div
      className="w-full h-full flex items-center justify-center px-10"
      style={PLACEHOLDER_STYLE}
      aria-label={title}
    >
      <p
        className={`text-white font-bold text-center leading-snug drop-shadow line-clamp-2 ${
          variant === "hero" ? "text-xl md:text-2xl" : "text-sm md:text-base"
        }`}
      >
        {displayTitle}
      </p>
    </div>
  );
}

/** Card variant — fixed h-40, rounded-xl */
export function NotificationBanner({
  imageUrl,
  title,
  alt,
}: Omit<NotificationBannerProps, "variant" | "caption" | "description">) {
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
        <BannerPlaceholder title={title} variant="card" />
      )}
    </div>
  );
}

/** Hero variant — aspect-video, rounded-3xl, caption overlay, hover scale */
export function HeroNotificationBanner({
  imageUrl,
  title,
  alt,
  caption,
  description,
}: Omit<NotificationBannerProps, "variant">) {
  const [imgError, setImgError] = useState(false);
  const showImage = imageUrl && !imgError;

  return (
    <section className="mb-12">
      <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt || `${title} - Official Notification`}
            title={title}
            width={1280}
            height={720}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <BannerPlaceholder title={title} variant="hero" />
        )}

        {(caption || description) && (
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-gray-950/90 to-transparent">
            {caption && (
              <p className="text-sm font-bold text-white mb-1">{caption}</p>
            )}
            {description && (
              <p className="text-xs text-gray-300 font-light">{description}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

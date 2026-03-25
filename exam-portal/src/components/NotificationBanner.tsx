"use client";

import { useState } from "react";

interface NotificationBannerProps {
  imageUrl?: string | null;
  title: string;
  alt?: string;
}

/** Deterministic gradient index from title string */
function gradientIndex(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return hash % GRADIENTS.length;
}

const GRADIENTS = [
  "from-[#0d1b3e] via-[#1a1060] to-[#2d1080]",
  "from-[#0a1628] via-[#0f2460] to-[#1e0f6e]",
  "from-[#0d1f3c] via-[#1b0e5a] to-[#360b6e]",
  "from-[#07172e] via-[#0e1e5a] to-[#251069]",
  "from-[#0b1535] via-[#160c55] to-[#2a0c72]",
];

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full opacity-80"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full opacity-80"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function BannerPlaceholder({ title }: { title: string }) {
  const gi = gradientIndex(title);
  const gradient = GRADIENTS[gi];

  // Truncate title for display
  const displayTitle =
    title.length > 52 ? title.slice(0, 50) + "…" : title;

  return (
    <div
      className={`w-full h-full bg-gradient-to-r ${gradient} flex items-center justify-between px-6 gap-4`}
      aria-label={title}
    >
      {/* Left icon */}
      <div className="flex-shrink-0 w-10 h-10 text-white/70">
        <ShieldIcon />
      </div>

      {/* Title block */}
      <div className="flex-1 min-w-0 text-center">
        <p className="text-white font-bold text-sm md:text-base leading-snug line-clamp-2 drop-shadow">
          {displayTitle}
        </p>
      </div>

      {/* Right icon */}
      <div className="flex-shrink-0 w-9 h-9 text-white/70">
        <DocumentIcon />
      </div>
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

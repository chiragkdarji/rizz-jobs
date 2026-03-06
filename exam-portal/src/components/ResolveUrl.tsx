"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface ResolveUrlProps {
  title: string;
  link: string;
  source: string;
}

export function ResolveUrl({ title, link, source }: ResolveUrlProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(link);

  useEffect(() => {
    const params = new URLSearchParams({ title, link, source });
    fetch(`/api/resolve-url?${params.toString()}`)
      .then(res => res.json())
      .then(data => { if (data.url) setResolvedUrl(data.url); })
      .catch(() => {
        if (link?.startsWith('http')) setResolvedUrl(link);
      });
  }, [title, link, source]);

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl"
    >
      Official Website
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}

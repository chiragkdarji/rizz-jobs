"use client";

import { useEffect, useRef } from "react";

export default function NewsViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    if (navigator.webdriver) return; // skip headless browsers

    fetch("/api/news-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      credentials: "same-origin",
    }).catch(() => {});
  }, [slug]);

  return null;
}

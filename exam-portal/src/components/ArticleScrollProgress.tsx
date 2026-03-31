"use client";

import { useEffect, useState } from "react";

export default function ArticleScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-[200] h-[2px]"
      style={{
        width: `${progress}%`,
        backgroundColor: "#f0a500",
        transition: "width 80ms linear",
      }}
    />
  );
}

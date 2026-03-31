"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 50,
        width: "44px",
        height: "44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0d0d10",
        border: "1px solid #1e1e24",
        color: "#7c7888",
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#f2ede6";
        (e.currentTarget as HTMLElement).style.borderColor = "#f0a500";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#7c7888";
        (e.currentTarget as HTMLElement).style.borderColor = "#1e1e24";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

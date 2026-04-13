import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "IPL 2026 Fantasy | Rizz Jobs",
  description: "IPL 2026 fantasy cricket section — coming soon.",
};

export default function FantasyPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p
        className="text-4xl font-bold mb-4"
        style={{ color: "#FFB800", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        Coming Soon
      </p>
      <p className="text-base mb-8" style={{ color: "#5A566A" }}>
        The Fantasy section is temporarily unavailable. Check back later.
      </p>
      <Link
        href="/ipl"
        className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm"
        style={{
          background: "#2A2A3A",
          color: "#FFB800",
          border: "1px solid #FFB80044",
          fontFamily: "var(--font-ipl-display, sans-serif)",
        }}
      >
        ← Back to IPL Hub
      </Link>
    </div>
  );
}

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
        style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        Coming Soon
      </p>
      <p className="text-base mb-8" style={{ color: "#6B86A0" }}>
        The Fantasy section is temporarily unavailable. Check back later.
      </p>
      <Link
        href="/ipl"
        className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm"
        style={{
          background: "#0E2235",
          color: "#D4AF37",
          border: "1px solid #D4AF3744",
          fontFamily: "var(--font-ipl-display, sans-serif)",
        }}
      >
        ← Back to IPL Hub
      </Link>
    </div>
  );
}

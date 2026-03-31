import Link from "next/link";

const CATEGORIES = [
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

export default function NewsFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: "#070708", borderTop: "1px solid #1e1e24" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

        {/* ── Top grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <Link href="/news" className="inline-flex flex-col leading-none mb-4 group">
              <span
                className="text-[#f2ede6]"
                style={{
                  fontFamily: "'DM Serif Display', 'Georgia', serif",
                  fontSize: "1.4rem",
                  fontWeight: 400,
                }}
              >
                Rizz Jobs
              </span>
              <span
                className="font-black uppercase"
                style={{ fontSize: "8px", letterSpacing: "0.22em", color: "#f0a500" }}
              >
                Financial Intelligence
              </span>
            </Link>
            <p className="text-[12px] leading-relaxed max-w-xs" style={{ color: "#52505e" }}>
              AI-curated finance, business, markets, economy and startup news for the Indian investor and professional.
            </p>
          </div>

          {/* Categories */}
          <div>
            <p
              className="text-[9px] font-black uppercase tracking-[0.22em] mb-4"
              style={{ color: "#3a3848" }}
            >
              News Categories
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/news"
                  className="text-[12px] transition-colors hover:text-[#f2ede6]"
                  style={{ color: "#52505e" }}
                >
                  All News
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="text-[12px] transition-colors hover:text-[#f2ede6]"
                    style={{ color: "#52505e" }}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter CTA */}
          <div>
            <p
              className="text-[9px] font-black uppercase tracking-[0.22em] mb-4"
              style={{ color: "#3a3848" }}
            >
              Daily Briefing
            </p>
            <p className="text-[12px] leading-relaxed mb-4" style={{ color: "#52505e" }}>
              Get India&apos;s top financial stories delivered to your inbox every morning.
            </p>
            <Link
              href="/news/subscribe"
              className="inline-block text-[10px] font-black uppercase tracking-[0.18em] px-4 py-2.5 transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#f0a500", color: "#070708" }}
            >
              Subscribe Free →
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
          style={{ borderTop: "1px solid #1e1e24" }}
        >
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "#3a3848" }}>
            © {year} Rizz Jobs · Financial Intelligence
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { label: "About",      href: "/news/about" },
              { label: "Contact",    href: "/news/contact" },
              { label: "Disclaimer", href: "/news/disclaimer" },
              { label: "Privacy",    href: "/news/privacy" },
              { label: "Terms",      href: "/news/terms" },
              { label: "← Jobs Portal", href: "/" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[10px] uppercase tracking-wide transition-colors hover:text-[#52505e]"
                style={{ color: "#3a3848" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

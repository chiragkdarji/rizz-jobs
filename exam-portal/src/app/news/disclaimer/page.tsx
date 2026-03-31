import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer | Rizz Jobs Financial Intelligence",
  description: "Financial disclaimer for Rizz Jobs Financial Intelligence. Content is for informational purposes only and does not constitute financial advice.",
  alternates: { canonical: "https://rizzjobs.in/news/disclaimer" },
};

const SECTIONS = [
  {
    heading: "Not Financial Advice",
    body: `All content published by Rizz Jobs Financial Intelligence — including articles, summaries, market briefings, and newsletter editions — is provided for informational and educational purposes only. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional financial guidance.`,
  },
  {
    heading: "AI-Generated Content",
    body: `Articles on this platform are generated and edited with the assistance of artificial intelligence. While we strive for accuracy, AI-generated content may contain errors, omissions, or inaccuracies. Rizz Jobs does not guarantee the completeness, timeliness, or accuracy of any article.`,
  },
  {
    heading: "No Investment Recommendation",
    body: `References to specific securities, indices, funds, companies, or financial instruments are for illustrative and informational purposes only. They do not constitute a recommendation to buy, sell, or hold any investment. Past performance mentioned in any article is not indicative of future results.`,
  },
  {
    heading: "Independent Verification",
    body: `Readers should independently verify any financial information before making investment decisions. We strongly recommend consulting a SEBI-registered financial advisor or investment professional before making any financial decision.`,
  },
  {
    heading: "Third-Party Sources",
    body: `Our editorial pipeline aggregates information from publicly available news sources. Rizz Jobs is not responsible for the accuracy of information sourced from third parties. Links to external sources are provided for reference only.`,
  },
  {
    heading: "No Liability",
    body: `Rizz Jobs and its operators shall not be held liable for any financial loss, damage, or adverse outcome resulting from reliance on content published on this platform. Use of this service is entirely at your own risk.`,
  },
  {
    heading: "Corrections Policy",
    body: `We are committed to correcting factual errors promptly. If you believe an article contains an error, please contact us at editorial@rizzjobs.in with details. Corrections will be noted in the affected article.`,
  },
];

export default function NewsDisclaimerPage() {
  return (
    <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#f0a500" }}>
          Legal
        </p>
        <h1
          className="text-[clamp(2rem,5vw,3rem)] text-[#f2ede6] leading-[1.1] mb-3"
          style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
        >
          Disclaimer
        </h1>
        <p className="text-[11px] mb-10" style={{ color: "#7c7888" }}>
          Last updated: April 2026
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="pb-8" style={{ borderBottom: "1px solid #1e1e24" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: "#7c7888" }}>
                {s.heading}
              </p>
              <p className="text-[13px] leading-[1.85]" style={{ color: "#7c7888" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/news/privacy" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Privacy Policy</Link>
          <Link href="/news/terms" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Terms & Conditions</Link>
          <Link href="/news/contact" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Contact</Link>
        </div>
      </div>
    </div>
  );
}

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Rizz Jobs Financial Intelligence",
  description: "Terms and conditions for using Rizz Jobs Financial Intelligence news service.",
  alternates: { canonical: "https://rizzjobs.in/news/terms" },
};

const SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body: `By accessing or using the Rizz Jobs Financial Intelligence news service at rizzjobs.in/news, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use this service.`,
  },
  {
    heading: "Service Description",
    body: `Rizz Jobs Financial Intelligence provides AI-curated financial news summaries for informational purposes. We aggregate and rewrite publicly available news for Indian investors and professionals. The service is provided free of charge.`,
  },
  {
    heading: "Intellectual Property",
    body: `All content published on this platform — including AI-generated articles, summaries, and editorial text — is owned by Rizz Jobs. You may not reproduce, distribute, or republish our content without prior written permission. Sharing individual article links is permitted and encouraged.`,
  },
  {
    heading: "Acceptable Use",
    body: `You agree not to: scrape or systematically download content from this platform; use automated bots to access or index our content; attempt to interfere with the security or functionality of this service; use our content for any commercial purpose without permission.`,
  },
  {
    heading: "Newsletter Subscription",
    body: `By subscribing to our newsletter, you consent to receive email communications from Rizz Jobs Financial Intelligence. Subscriptions are confirmed via email. You may unsubscribe at any time using the link in any email we send.`,
  },
  {
    heading: "Content Accuracy",
    body: `While we strive for accuracy, we do not guarantee that all content is free from errors or omissions. Content is provided on an "as is" basis. We are not liable for any decisions made based on content published on this platform. See our full Disclaimer for details.`,
  },
  {
    heading: "Third-Party Links",
    body: `Articles may reference or link to third-party websites. We are not responsible for the content, accuracy, or practices of any linked external site. Links are provided for reference only.`,
  },
  {
    heading: "Modifications to Service",
    body: `We reserve the right to modify, suspend, or discontinue any part of this service at any time without notice. We may update these Terms at any time. Continued use of the service following any changes constitutes acceptance of the updated Terms.`,
  },
  {
    heading: "Governing Law",
    body: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.`,
  },
];

export default function NewsTermsPage() {
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
          Terms &amp; Conditions
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

        <div className="mt-8">
          <p className="text-[13px] leading-relaxed" style={{ color: "#7c7888" }}>
            Questions about these terms? Email{" "}
            <a href="mailto:hello@rizzjobs.in" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>
              hello@rizzjobs.in
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/news/privacy" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Privacy Policy</Link>
          <Link href="/news/disclaimer" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Disclaimer</Link>
          <Link href="/news/contact" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#7c7888" }}>Contact</Link>
        </div>
      </div>
    </div>
  );
}

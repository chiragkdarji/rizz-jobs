import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Rizz Jobs Financial Intelligence",
  description: "Privacy policy for Rizz Jobs Financial Intelligence news service.",
  alternates: { canonical: "https://rizzjobs.in/news/privacy" },
};

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: `When you subscribe to our newsletter, we collect your email address and your topic and frequency preferences. We do not collect any other personal information unless you contact us directly.`,
  },
  {
    heading: "How We Use Your Information",
    body: `Your email address is used solely to send you the Financial Intelligence newsletter you subscribed to. We do not use your email for any other purpose, and we do not share, sell, or rent your email address to any third party.`,
  },
  {
    heading: "Newsletter & Email Communications",
    body: `By subscribing, you consent to receive editorial newsletters from Rizz Jobs Financial Intelligence. Every email includes an unsubscribe link. You can unsubscribe at any time, and your data will be removed from our mailing list within 7 days.`,
  },
  {
    heading: "Cookies & Analytics",
    body: `We use Google Tag Manager and Google Analytics to understand how readers interact with our content. These tools may set cookies on your device. No personally identifiable information is collected through analytics. You can opt out via your browser settings or Google's opt-out tools.`,
  },
  {
    heading: "Data Storage",
    body: `Subscriber data is stored securely using Supabase (hosted on AWS). Data is stored in the EU (Ireland) region. We implement appropriate technical and organisational measures to protect your data against unauthorised access.`,
  },
  {
    heading: "Your Rights",
    body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, email us at privacy@rizzjobs.in. We will respond within 30 days.`,
  },
  {
    heading: "Third-Party Services",
    body: `We use Resend for email delivery and Google Analytics for site analytics. These services may process your data in accordance with their own privacy policies. We do not control their data practices.`,
  },
  {
    heading: "Changes to This Policy",
    body: `We may update this privacy policy from time to time. Changes will be posted on this page with an updated date. Continued use of the service after changes constitutes acceptance of the updated policy.`,
  },
];

export default function NewsPrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-[11px] mb-10" style={{ color: "#3a3848" }}>
          Last updated: April 2026
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="pb-8" style={{ borderBottom: "1px solid #1e1e24" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: "#3a3848" }}>
                {s.heading}
              </p>
              <p className="text-[13px] leading-[1.85]" style={{ color: "#52505e" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-[13px] leading-relaxed" style={{ color: "#52505e" }}>
            Questions about this policy? Email{" "}
            <a href="mailto:privacy@rizzjobs.in" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>
              privacy@rizzjobs.in
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/news/terms" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#52505e" }}>Terms & Conditions</Link>
          <Link href="/news/disclaimer" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#52505e" }}>Disclaimer</Link>
          <Link href="/news/contact" className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:text-[#f2ede6]" style={{ color: "#52505e" }}>Contact</Link>
        </div>
      </div>
    </div>
  );
}

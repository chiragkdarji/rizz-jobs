import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Rizz Jobs Financial Intelligence",
  description: "Contact the Rizz Jobs Financial Intelligence editorial team for corrections, feedback, or press enquiries.",
  alternates: { canonical: "https://rizzjobs.in/news/contact" },
};

export default function NewsContactPage() {
  return (
    <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#f0a500" }}>
          Contact
        </p>
        <h1
          className="text-[clamp(2rem,5vw,3rem)] text-[#f2ede6] leading-[1.1] mb-8"
          style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
        >
          Get in Touch
        </h1>

        <div className="space-y-10">

          {[
            {
              title: "Editorial Corrections",
              desc: "If you believe a published article contains a factual error, please write to us with the article URL, the specific error, and the correct information.",
              email: "editorial@rizzjobs.in",
            },
            {
              title: "Feedback & Suggestions",
              desc: "We welcome reader feedback on our coverage, tone, and topics. Tell us what financial stories matter most to you.",
              email: "feedback@rizzjobs.in",
            },
            {
              title: "Press & Partnerships",
              desc: "For media enquiries, content partnerships, or advertising opportunities.",
              email: "hello@rizzjobs.in",
            },
          ].map((item) => (
            <div key={item.title} className="pb-8" style={{ borderBottom: "1px solid #1e1e24" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: "#3a3848" }}>
                {item.title}
              </p>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#52505e" }}>
                {item.desc}
              </p>
              <a
                href={`mailto:${item.email}`}
                className="text-[12px] font-black transition-colors hover:opacity-80"
                style={{ color: "#f0a500" }}
              >
                {item.email}
              </a>
            </div>
          ))}

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: "#3a3848" }}>
              Publishing Principles
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#52505e" }}>
              Read about our <Link href="/news/about" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>editorial approach</Link>, our <Link href="/news/disclaimer" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>disclaimer</Link>, and our <Link href="/news/privacy" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>privacy policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

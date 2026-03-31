import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";

function isTokenValid(token: string): boolean {
  if (token.length < 12) return false;
  try {
    const expiresAt = parseInt(token.substring(0, 12), 16);
    return Math.floor(Date.now() / 1000) < expiresAt;
  } catch {
    return false;
  }
}

type Status = "confirmed" | "already" | "expired" | "invalid" | "error";

async function confirmToken(token: string | null): Promise<Status> {
  if (!token) return "invalid";
  if (!isTokenValid(token)) return "expired";

  try {
    const supabase = createServiceRoleClient();

    const { data: sub, error: fetchErr } = await supabase
      .from("news_subscriptions")
      .select("id, confirmed")
      .eq("confirm_token", token)
      .maybeSingle();

    if (fetchErr || !sub) return "invalid";
    if (sub.confirmed) return "already";

    const { error: updateErr } = await supabase
      .from("news_subscriptions")
      .update({ confirmed: true })
      .eq("id", sub.id);

    if (updateErr) return "error";
    return "confirmed";
  } catch {
    return "error";
  }
}

const STATES: Record<Status, {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
}> = {
  confirmed: {
    icon: "✓",
    iconColor: "#f0a500",
    title: "You're subscribed.",
    body: "Your Financial Intelligence briefing is active. India's top finance, business and markets stories are on their way.",
    cta: "Go to News →",
    ctaHref: "/news",
  },
  already: {
    icon: "✓",
    iconColor: "#f0a500",
    title: "Already confirmed.",
    body: "Your subscription is already active. Check your inbox for the latest briefings.",
    cta: "Go to News →",
    ctaHref: "/news",
  },
  expired: {
    icon: "↺",
    iconColor: "#f59e0b",
    title: "Link expired.",
    body: "Confirmation links are valid for 24 hours. Subscribe again to get a fresh link.",
    cta: "Subscribe again →",
    ctaHref: "/news/subscribe",
  },
  invalid: {
    icon: "✕",
    iconColor: "#f43f5e",
    title: "Invalid link.",
    body: "This confirmation link is not recognised. Please subscribe again or check your inbox for the latest email.",
    cta: "Subscribe again →",
    ctaHref: "/news/subscribe",
  },
  error: {
    icon: "✕",
    iconColor: "#f43f5e",
    title: "Something went wrong.",
    body: "We couldn't confirm your subscription right now. Please try again in a moment.",
    cta: "Subscribe again →",
    ctaHref: "/news/subscribe",
  },
};

export default async function NewsSubscribeConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const status = await confirmToken(token ?? null);
  const s = STATES[status];

  return (
    <div
      style={{ backgroundColor: "#070708", minHeight: "60vh" }}
      className="flex items-center justify-center px-4 py-20"
    >
      <div className="max-w-md w-full">
        {/* Label */}
        <p
          className="text-[9px] font-black uppercase tracking-[0.22em] mb-6"
          style={{ color: "#f0a500" }}
        >
          Financial Intelligence
        </p>

        {/* Icon */}
        <div
          className="w-14 h-14 flex items-center justify-center mb-6 text-2xl font-black"
          style={{ border: `2px solid ${s.iconColor}`, color: s.iconColor }}
        >
          {s.icon}
        </div>

        {/* Heading */}
        <h1
          className="text-[clamp(1.6rem,4vw,2.4rem)] text-[#f2ede6] leading-[1.1] mb-4"
          style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
        >
          {s.title}
        </h1>

        {/* Body */}
        <p className="text-[13px] leading-relaxed mb-8" style={{ color: "#7c7888" }}>
          {s.body}
        </p>

        {/* CTA */}
        <Link
          href={s.ctaHref}
          className="inline-block text-[10px] font-black uppercase tracking-[0.18em] px-6 py-3 transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#f0a500", color: "#070708" }}
        >
          {s.cta}
        </Link>
      </div>
    </div>
  );
}

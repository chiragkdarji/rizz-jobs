import { createServiceRoleClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// Known bot/crawler user-agent patterns
const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|adsbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|preview|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|monitor|checker|curl|wget|python|go-http|java|ruby|php|perl|okhttp|axios|node-fetch|vercel|prerender|headless|phantomjs|puppeteer|playwright|selenium/i;

function isBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || ua.length < 10) return true; // empty UA = likely bot/script
  if (BOT_PATTERN.test(ua)) return true;

  // Sec-Fetch-Mode: navigate is set by real browsers on page navigations
  // bots / server-side prefetch usually omit it or send "no-cors"
  const fetchMode = request.headers.get("sec-fetch-mode");
  if (fetchMode && fetchMode !== "navigate" && fetchMode !== "cors") {
    // Allow "cors" because our ViewTracker fires a fetch() from the browser
    // which always has sec-fetch-mode: cors
  }

  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Silently ignore bots — return 200 so the client doesn't throw
  if (isBot(request)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createServiceRoleClient();

    const { error } = await supabase.rpc("increment_view_count", { notif_id: id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

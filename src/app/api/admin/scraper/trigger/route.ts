import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await requireAdmin();

    const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;
    const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json(
        {
          error:
            "Scraper webhook not configured. Set SCRAPER_WEBHOOK_URL and SCRAPER_WEBHOOK_SECRET.",
        },
        { status: 500 }
      );
    }

    // Send webhook request to external scraper server
    // This returns immediately; the actual scraping happens asynchronously on the scraper server
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({
        triggered_at: new Date().toISOString(),
        source: "admin_panel",
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to trigger scraper" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      status: "triggered",
      message: "Scraper has been triggered. Check the scraper server logs for progress.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

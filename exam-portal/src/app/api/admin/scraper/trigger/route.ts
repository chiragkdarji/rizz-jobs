import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

/**
 * Triggers the scraper via GitHub Actions workflow_dispatch API.
 *
 * Required env vars:
 *   GITHUB_OWNER          - GitHub username or org (e.g. "VGraple")
 *   GITHUB_REPO           - Repo name (e.g. "Google-Antigravity")
 *   GITHUB_SCRAPER_TOKEN  - Personal Access Token with Actions: write scope
 *   GITHUB_WORKFLOW_FILE  - Workflow filename (default: "scraper.yml")
 *
 * Falls back to generic webhook (SCRAPER_WEBHOOK_URL + SCRAPER_WEBHOOK_SECRET)
 * if GitHub env vars are not set — for custom server setups.
 */
export async function POST() {
  try {
    await requireAdmin();

    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_SCRAPER_TOKEN;
    const workflowFile = process.env.GITHUB_WORKFLOW_FILE || "scraper.yml";

    // --- Mode 1: GitHub Actions workflow_dispatch (preferred) ---
    if (githubOwner && githubRepo && githubToken) {
      const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflowFile}/dispatches`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "master" }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("GitHub API error:", response.status, body);
        return NextResponse.json(
          { error: `GitHub Actions trigger failed (${response.status})` },
          { status: response.status }
        );
      }

      // GitHub returns 204 No Content on success
      return NextResponse.json({
        success: true,
        status: "triggered",
        message: "Scraper workflow dispatched via GitHub Actions.",
      });
    }

    // --- Mode 2: Custom webhook server (fallback) ---
    const { createHmac } = await import("crypto");
    const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;
    const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json(
        {
          error:
            "Scraper not configured. Set GITHUB_OWNER + GITHUB_REPO + GITHUB_SCRAPER_TOKEN, " +
            "or SCRAPER_WEBHOOK_URL + SCRAPER_WEBHOOK_SECRET.",
        },
        { status: 500 }
      );
    }

    const payload = JSON.stringify({
      triggered_at: new Date().toISOString(),
      source: "admin_panel",
    });

    // HMAC-SHA256 sign the payload so the custom server can verify authenticity
    const signature = createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Receiver should verify: HMAC-SHA256(body, SCRAPER_WEBHOOK_SECRET) === X-Signature value
        "X-Signature": `sha256=${signature}`,
      },
      body: payload,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to trigger scraper webhook" },
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

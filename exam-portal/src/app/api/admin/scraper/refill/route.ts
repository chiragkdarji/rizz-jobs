import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Triggers the scraper in --refill mode:
 *   python main.py --refill --refill-limit <limit>
 *
 * GitHub Actions: dispatches the same workflow but passes inputs.mode = "refill"
 *   and inputs.refill_limit = <N>.
 *   The workflow YAML must declare these inputs and pass them to the script.
 *
 * Custom webhook: sends { mode: "refill", refill_limit } in the payload body.
 *
 * Query param: ?limit=N (default 30)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const refillLimit = Math.min(
      parseInt(searchParams.get("limit") || "30", 10),
      200
    );

    const githubOwner  = process.env.GITHUB_OWNER;
    const githubRepo   = process.env.GITHUB_REPO;
    const githubToken  = process.env.GITHUB_SCRAPER_TOKEN;
    const workflowFile = process.env.GITHUB_WORKFLOW_FILE || "scraper.yml";

    // ── Mode 1: GitHub Actions workflow_dispatch ─────────────────────────────
    if (githubOwner && githubRepo && githubToken) {
      const url =
        `https://api.github.com/repos/${githubOwner}/${githubRepo}` +
        `/actions/workflows/${workflowFile}/dispatches`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept":               "application/vnd.github+json",
          "Authorization":        `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type":         "application/json",
        },
        body: JSON.stringify({
          ref: "master",
          inputs: {
            mode:          "refill",
            refill_limit:  String(refillLimit),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("GitHub API error:", response.status, body);
        return NextResponse.json(
          { error: `GitHub Actions trigger failed (${response.status})` },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        status:  "triggered",
        message: `Refill workflow dispatched via GitHub Actions (limit: ${refillLimit}).`,
      });
    }

    // ── Mode 2: Custom webhook server ────────────────────────────────────────
    const { createHmac } = await import("crypto");
    const webhookUrl    = process.env.SCRAPER_WEBHOOK_URL;
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
      mode:          "refill",
      refill_limit:  refillLimit,
      triggered_at:  new Date().toISOString(),
      source:        "admin_panel",
    });

    const signature = createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    const response = await fetch(webhookUrl, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature":  `sha256=${signature}`,
      },
      body: payload,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to trigger refill webhook" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      status:  "triggered",
      message: `Refill triggered (limit: ${refillLimit}). Check scraper logs for progress.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

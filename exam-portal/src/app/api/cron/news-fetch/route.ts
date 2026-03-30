// Vercel Cron endpoint — triggers the news-scraper.yml GitHub Actions workflow
// every hour. Uses the same GitHub dispatch pattern as /api/admin/scraper/trigger.
// Schedule: "0 * * * *" in vercel.json

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_SCRAPER_TOKEN;
  const workflowFile =
    process.env.GITHUB_NEWS_WORKFLOW_FILE ?? "news-scraper.yml";

  if (!owner || !repo || !githubToken) {
    return NextResponse.json(
      { error: "Missing GitHub env vars (GITHUB_OWNER, GITHUB_REPO, GITHUB_SCRAPER_TOKEN)" },
      { status: 500 }
    );
  }

  const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

  const response = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "master" }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: "GitHub workflow dispatch failed", detail },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    triggered_at: new Date().toISOString(),
    workflow: workflowFile,
  });
}

import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function buildPrompt(
  title: string,
  existingContext: {
    link?: string;
    ai_summary?: string;
    details?: Record<string, unknown> | null;
  },
  extraHint: string
): string {
  const lines: string[] = [];

  lines.push(`You are an expert Government Exam Researcher in India.`);
  lines.push(`Exam / Recruitment Title: ${title}`);
  lines.push(``);

  // Anchor the AI with everything we already know about THIS specific notification
  lines.push(`EXISTING RECORD CONTEXT — this is the SAME notification you must research:`);

  if (existingContext.link) {
    lines.push(`  Current URL on file: ${existingContext.link}`);
  }
  if (existingContext.ai_summary) {
    lines.push(`  Current summary: ${existingContext.ai_summary}`);
  }

  const d = existingContext.details ?? {};
  if (d.what_is_the_update) {
    lines.push(`  Existing update text: ${d.what_is_the_update}`);
  }
  if (d.vacancies) {
    lines.push(`  Existing vacancies: ${d.vacancies}`);
  }
  if (d.eligibility) {
    lines.push(`  Existing eligibility: ${d.eligibility}`);
  }

  if (extraHint.trim()) {
    lines.push(``);
    lines.push(`ADMIN-PROVIDED HINT (treat as high-confidence context):`);
    lines.push(extraHint.trim());
  }

  lines.push(``);
  lines.push(`TASK: Using the context above to identify the EXACT notification, research it thoroughly`);
  lines.push(`and fill every field below. Do not confuse this with a different exam of similar name.`);
  lines.push(``);
  lines.push(`Return a single JSON object:`);
  lines.push(`{`);
  lines.push(`  "official_link": "Best .gov.in or .nic.in URL — org homepage beats a guessed 404 deep path",`);
  lines.push(`  "ai_summary": "One punchy sentence — what is this, vacancies, who can apply?",`);
  lines.push(`  "exam_date": "YYYY-MM-DD or null",`);
  lines.push(`  "deadline": "YYYY-MM-DD (application last date) or null",`);
  lines.push(`  "details": {`);
  lines.push(`    "what_is_the_update": "3-4 professional sentences on the latest status",`);
  lines.push(`    "direct_answer": ["key fact 1", "key fact 2", "key fact 3"],`);
  lines.push(`    "categories": ["one from: 10th / 12th Pass, Banking, Railway, Defense / Police, UPSC / SSC, Teaching, Engineering, Medical, PSU, State Jobs, Other"],`);
  lines.push(`    "important_dates": {"Notification Date": "YYYY-MM-DD", "Last Date": "YYYY-MM-DD"},`);
  lines.push(`    "application_fee": "Fee by category as plain text",`);
  lines.push(`    "vacancies": "Total + post-wise breakdown as plain text",`);
  lines.push(`    "age_limit": "Age requirement as plain text",`);
  lines.push(`    "eligibility": "Educational qualification as plain text",`);
  lines.push(`    "selection_process": "Stage 1\\nStage 2\\nStage 3",`);
  lines.push(`    "how_to_apply": "Step 1\\nStep 2\\nStep 3",`);
  lines.push(`    "faqs": [{"q": "...", "a": "..."}]`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`Rules:`);
  lines.push(`- Never return aggregator URLs (sarkari*, freejobalert, jagranjosh, testbook, naukri)`);
  lines.push(`- Return null for dates you are not certain about — never invent dates`);
  lines.push(`- If the title is ambiguous, rely on the context above to identify the correct notification`);

  return lines.join("\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    // Optional extra hint from admin
    let extraHint = "";
    try {
      const body = await request.json() as { hint?: string };
      extraHint = (body.hint ?? "").slice(0, 2000);
    } catch { /* no body is fine */ }

    const supabase = createServiceRoleClient();
    const { data: current, error } = await supabase
      .from("notifications")
      .select("id, title, slug, link, ai_summary, exam_date, deadline, details, seo")
      .eq("id", id)
      .single();

    if (error || !current) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const prompt = buildPrompt(
      current.title,
      {
        link:       current.link,
        ai_summary: current.ai_summary,
        details:    current.details as Record<string, unknown> | null,
      },
      extraHint
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: { message?: string } }).error?.message || "AI research failed" },
        { status: 500 }
      );
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const proposed = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ current, proposed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

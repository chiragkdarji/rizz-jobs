import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const PROMPT = `You are an expert Government Exam Researcher in India.
Exam Title: @TITLE@

Research this exam/recruitment notification thoroughly and return all available information.
Return a single flat JSON object with these exact keys:

{
  "official_link": "Best official .gov.in or .nic.in URL (homepage is fine if unsure of deep path)",
  "ai_summary": "One punchy sentence — what is this, how many vacancies, who can apply?",
  "exam_date": "YYYY-MM-DD or null",
  "deadline": "YYYY-MM-DD (application last date) or null",
  "details": {
    "what_is_the_update": "3-4 professional sentences explaining the latest status",
    "direct_answer": ["key fact 1", "key fact 2", "key fact 3"],
    "categories": ["one from: 10th / 12th Pass, Banking, Railway, Defense / Police, UPSC / SSC, Teaching, Engineering, Medical, PSU, State Jobs, Other"],
    "important_dates": {"Notification Date": "YYYY-MM-DD", "Last Date": "YYYY-MM-DD"},
    "application_fee": "Fee by category as plain text",
    "vacancies": "Total and post-wise breakdown as plain text",
    "age_limit": "Age requirement as plain text",
    "eligibility": "Educational qualification as plain text",
    "selection_process": "Stage 1\\nStage 2\\nStage 3",
    "how_to_apply": "Step 1\\nStep 2\\nStep 3",
    "faqs": [{"q": "...", "a": "..."}]
  }
}

Rules:
- Never return aggregator URLs (sarkari*, freejobalert, jagranjosh, testbook, naukri)
- Return null for dates you don't know — never invent dates
- For official_link: org homepage is better than a guessed 404 deep path`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const supabase = createServiceRoleClient();
    const { data: current, error } = await supabase
      .from("notifications")
      .select("id, title, slug, link, ai_summary, exam_date, deadline, details, seo")
      .eq("id", id)
      .single();

    if (error || !current) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const prompt = PROMPT.replace("@TITLE@", current.title);

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

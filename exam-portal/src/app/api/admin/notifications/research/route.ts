import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

const RESEARCH_PROMPT = `You are an expert Government Exam Researcher in India.
Exam Title: @TITLE@
URL Hint (if provided, use as official link if it's a government domain): @URL@

TASK 1: IDENTIFY THE OFFICIAL PORTAL
- If a URL hint is provided and points to a .gov.in or .nic.in domain, use it as official_link
- Otherwise, use your knowledge to find the EXACT notification page URL on the official government portal
- A good deep link has path segments like /recruitment/, /notification/, /career/, /vacancy/, /advt/, /apply/
- Example good: https://upsc.gov.in/examinations/civil-services-2026
- Example bad: https://upsc.gov.in (homepage only — avoid unless no deep link found)
- NEVER return aggregator links (sarkari*, freejobalert, jagranjosh, testbook, etc)

TASK 2: SYNTHESIZE RICH CONTENT
- ai_summary: 1 punchy sentence highlighting vacancies, deadline, eligibility (e.g., "17,727 posts, apply by Apr 30, graduate eligible")
- what_is_the_update: 3-4 professional sentences explaining the latest status/what this exam is about
- direct_answer: JSON array of 3-5 key highlights as short bullet facts (e.g., ["17,727 vacancies", "Deadline: April 30", "Graduate eligible", "Apply at upsc.gov.in"])
- categories: 1-3 from this exact list only: ["10th / 12th Pass", "Banking", "Railway", "Defense / Police", "UPSC / SSC", "Teaching", "Engineering", "Medical", "PSU", "State Jobs", "Other"]
- important_dates: Object with milestone names as keys and dates as values (e.g., {"Application Start": "01 Apr 2025", "Last Date": "30 Apr 2025", "Exam Date": "15 Jun 2025"})
- application_fee: Fee structure as plain text (e.g., "General/OBC: Rs 100, SC/ST/Female: Nil")
- vacancies: Total posts and breakdown as plain text
- age_limit: Age requirements as plain text (e.g., "18-27 years. Relaxation for SC/ST/OBC as per govt norms")
- eligibility: Educational qualification as plain text
- selection_process: Steps separated by newlines (e.g., "Written Exam\nPhysical Test\nMedical Examination\nDocument Verification")
- how_to_apply: Step-by-step instructions separated by newlines
- exam_date: YYYY-MM-DD format or null if unknown
- deadline: YYYY-MM-DD format or null if unknown

Return as a single JSON object. If specific 2025/2026 dates are unknown, use "To be announced".

{
  "official_link": "...",
  "ai_summary": "...",
  "exam_date": "YYYY-MM-DD or null",
  "deadline": "YYYY-MM-DD or null",
  "details": {
    "what_is_the_update": "...",
    "direct_answer": ["...", "...", "..."],
    "categories": ["..."],
    "important_dates": {},
    "application_fee": "...",
    "vacancies": "...",
    "age_limit": "...",
    "eligibility": "...",
    "selection_process": "...",
    "how_to_apply": "..."
  }
}`;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const title = (body.title || "").slice(0, 200).trim();
    const url = (body.url || "").slice(0, 500).trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    const prompt = RESEARCH_PROMPT
      .replace("@TITLE@", title)
      .replace("@URL@", url || "Not provided");

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
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

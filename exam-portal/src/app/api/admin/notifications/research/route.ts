import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

// Allow up to 60s — GPT-4o with PDF can take 20-40s
export const maxDuration = 60;

const BASE_PROMPT = `You are an expert Government Exam Researcher in India.
Exam Title: @TITLE@
URL Hint (if provided, use as official link if it's a government domain): @URL@
@PDF_NOTE@

TASK 1: IDENTIFY THE OFFICIAL PORTAL
- If a PDF is attached, extract the official link from it — it is the most authoritative source
- If a URL hint is provided and points to a .gov.in or .nic.in domain, use it as official_link
- Otherwise, use your knowledge to find the EXACT notification page URL on the official government portal
- A good deep link has path segments like /recruitment/, /notification/, /career/, /vacancy/, /advt/, /apply/
- NEVER return aggregator links (sarkari*, freejobalert, jagranjosh, testbook, etc)

TASK 2: SYNTHESIZE RICH CONTENT (prioritise PDF data if provided, fill gaps with your knowledge)
- ai_summary: 1 punchy sentence highlighting vacancies, deadline, eligibility
- what_is_the_update: 3-4 professional sentences explaining the latest status
- direct_answer: JSON array of 3-5 key highlights (e.g. ["17,727 vacancies", "Deadline: April 30", "Graduate eligible"])
- categories: 1-3 from: ["10th / 12th Pass", "Banking", "Railway", "Defense / Police", "UPSC / SSC", "Teaching", "Engineering", "Medical", "PSU", "State Jobs", "Other"]
- important_dates: Object with milestone names as keys and dates as values
- application_fee: Fee structure as plain text
- vacancies: Total posts and breakdown as plain text
- age_limit: Age requirements as plain text
- eligibility: Educational qualification as plain text
- selection_process: Steps separated by newlines
- how_to_apply: Step-by-step instructions separated by newlines
- exam_date: YYYY-MM-DD format or null if unknown
- deadline: YYYY-MM-DD format or null if unknown

Return as a single JSON object. Use "To be announced" for unknown dates.

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

async function uploadPdfToOpenAI(
  pdfBytes: ArrayBuffer,
  filename: string,
  apiKey: string
): Promise<string> {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", blob, filename);

  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        "PDF upload to OpenAI failed"
    );
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

async function deletePdfFromOpenAI(fileId: string, apiKey: string) {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {}); // non-blocking cleanup
}

export async function POST(request: NextRequest) {
  let uploadedFileId: string | null = null;
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    await requireAdmin();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    // Accept either multipart/form-data (with PDF) or plain JSON
    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let url = "";
    let pdfFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = ((formData.get("title") as string) || "").slice(0, 200).trim();
      url = ((formData.get("url") as string) || "").slice(0, 500).trim();
      pdfFile = formData.get("pdf") as File | null;
    } else {
      const body = await request.json();
      title = (body.title || "").slice(0, 200).trim();
      url = (body.url || "").slice(0, 500).trim();
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const hasPdf = pdfFile && pdfFile.size > 0;

    // Build prompt
    const pdfNote = hasPdf
      ? "A PDF of the official notification is attached — treat it as the PRIMARY source. Extract all dates, fees, vacancies, and eligibility directly from it."
      : "";

    const prompt = BASE_PROMPT
      .replace("@TITLE@", title)
      .replace("@URL@", url || "Not provided")
      .replace("@PDF_NOTE@", pdfNote);

    // Build message content
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "file"; file: { file_id: string } };

    const content: ContentPart[] = [{ type: "text", text: prompt }];

    if (hasPdf && pdfFile) {
      const pdfBytes = await pdfFile.arrayBuffer();
      uploadedFileId = await uploadPdfToOpenAI(
        pdfBytes,
        pdfFile.name || "notification.pdf",
        apiKey
      );
      content.push({ type: "file", file: { file_id: uploadedFileId } });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: hasPdf ? content : prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            (err as { error?: { message?: string } }).error?.message ||
            "AI research failed",
        },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Always clean up uploaded PDF from OpenAI
    if (uploadedFileId && apiKey) {
      deletePdfFromOpenAI(uploadedFileId, apiKey);
    }
  }
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Save,
  AlertCircle,
  Loader2,
  RotateCcw,
  FileText,
  X,
} from "lucide-react";

const inputClass =
  "w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50";
const textareaClass =
  "w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50 font-mono text-sm";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

type Step = "input" | "researching" | "review";

interface ResearchResult {
  official_link?: string;
  ai_summary?: string;
  exam_date?: string | null;
  deadline?: string | null;
  details?: {
    what_is_the_update?: string;
    direct_answer?: string[];
    categories?: string[];
    important_dates?: Record<string, string>;
    application_fee?: unknown;
    vacancies?: unknown;
    age_limit?: string;
    eligibility?: unknown;
    selection_process?: unknown;
    how_to_apply?: unknown;
  };
}

function stringifyField(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join("\n");
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export default function NewNotificationPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Step 1 inputs
  const [titleInput, setTitleInput] = useState("");
  const [urlHint, setUrlHint] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 form state
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    ai_summary: "",
    exam_date: "",
    deadline: "",
  });
  const [detailsData, setDetailsData] = useState({
    what_is_the_update: "",
    direct_answer: "",
    important_dates: "",
    application_fee: "",
    vacancies: "",
    age_limit: "",
    eligibility: "",
    selection_process: "",
    how_to_apply: "",
  });
  const [importantDatesError, setImportantDatesError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleResearch = async () => {
    if (!titleInput.trim()) return;
    setStep("researching");
    setError(null);

    try {
      let res: Response;

      if (pdfFile) {
        // Send as multipart so the PDF reaches the server
        const fd = new FormData();
        fd.append("title", titleInput.trim());
        fd.append("url", urlHint.trim());
        fd.append("pdf", pdfFile);
        res = await fetch("/api/admin/notifications/research", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/admin/notifications/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleInput.trim(), url: urlHint.trim() }),
        });
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Research failed");
      }

      const data: ResearchResult = await res.json();
      const d = data.details || {};

      setFormData({
        title: titleInput.trim(),
        link: data.official_link || urlHint.trim() || "",
        ai_summary: data.ai_summary || "",
        exam_date: data.exam_date || "",
        deadline: data.deadline || "",
      });

      setDetailsData({
        what_is_the_update: d.what_is_the_update || "",
        direct_answer: Array.isArray(d.direct_answer) ? d.direct_answer.join("\n") : "",
        important_dates: d.important_dates
          ? JSON.stringify(d.important_dates, null, 2)
          : "",
        application_fee: stringifyField(d.application_fee),
        vacancies: stringifyField(d.vacancies),
        age_limit: d.age_limit || "",
        eligibility: stringifyField(d.eligibility),
        selection_process: stringifyField(d.selection_process),
        how_to_apply: stringifyField(d.how_to_apply),
      });

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
      setStep("input");
    }
  };

  const handlePublish = async () => {
    let parsedImportantDates: Record<string, string> | undefined;
    if (detailsData.important_dates.trim()) {
      try {
        parsedImportantDates = JSON.parse(detailsData.important_dates);
        setImportantDatesError(null);
      } catch {
        setImportantDatesError("Invalid JSON — fix before publishing");
        return;
      }
    }

    setIsPublishing(true);
    setError(null);

    const tryParse = (s: string): unknown => {
      const t = s.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try {
          return JSON.parse(t);
        } catch {
          /* keep as string */
        }
      }
      return s;
    };

    const details: Record<string, unknown> = {};
    if (detailsData.what_is_the_update.trim())
      details.what_is_the_update = detailsData.what_is_the_update;
    if (detailsData.direct_answer.trim())
      details.direct_answer = detailsData.direct_answer
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    if (parsedImportantDates) details.important_dates = parsedImportantDates;
    if (detailsData.application_fee.trim())
      details.application_fee = tryParse(detailsData.application_fee);
    if (detailsData.vacancies.trim())
      details.vacancies = tryParse(detailsData.vacancies);
    if (detailsData.age_limit.trim()) details.age_limit = detailsData.age_limit;
    if (detailsData.eligibility.trim())
      details.eligibility = tryParse(detailsData.eligibility);
    if (detailsData.selection_process.trim())
      details.selection_process = detailsData.selection_process;
    if (detailsData.how_to_apply.trim())
      details.how_to_apply = detailsData.how_to_apply;

    try {
      const res = await fetch("/api/admin/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, details }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Failed to publish");
      }

      const { id } = (await res.json()) as { id: string };
      router.push(`/admin/notifications/${id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
      setIsPublishing(false);
    }
  };

  // ─── Step 1: Title Input ────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <main className="relative z-10 max-w-xl mx-auto px-6 py-12">
        <Link
          href="/admin/notifications"
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notifications
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Add Notification</h1>
          <p className="text-gray-400 text-sm">
            Enter an exam title — AI will research and pre-fill all details.
            Upload the official PDF for maximum accuracy.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 space-y-6">
          <Field label="Exam Title *" hint="e.g. UPSC Civil Services 2026, SSC CGL 2025, RRB NTPC 2026">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              placeholder="UPSC Civil Services 2026"
              autoFocus
              className={inputClass}
            />
          </Field>

          <Field
            label="Official PDF (optional but recommended)"
            hint="Upload the official notification PDF — AI reads it directly for exact dates, fees, and vacancies"
          >
            {pdfFile ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="flex-1 text-sm text-emerald-300 truncate">
                  {pdfFile.name}
                  <span className="text-emerald-500 ml-2">
                    ({(pdfFile.size / 1024).toFixed(0)} KB)
                  </span>
                </span>
                <button
                  onClick={() => {
                    setPdfFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-emerald-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 border-dashed cursor-pointer hover:bg-white/8 hover:border-white/20 transition-colors">
                <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-500">
                  Click to upload PDF (max 20MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 20 * 1024 * 1024) {
                      setError("PDF must be under 20MB");
                      return;
                    }
                    setError(null);
                    setPdfFile(file);
                  }}
                />
              </label>
            )}
          </Field>

          <Field
            label="URL Hint (optional)"
            hint="Paste the official notification link — AI will use it as the primary source"
          >
            <input
              type="url"
              value={urlHint}
              onChange={(e) => setUrlHint(e.target.value)}
              placeholder="https://upsc.gov.in/..."
              className={inputClass}
            />
          </Field>

          <button
            onClick={handleResearch}
            disabled={!titleInput.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            {pdfFile ? "Research with AI + PDF" : "Research with AI"}
          </button>
        </div>
      </main>
    );
  }

  // ─── Step 2: Researching ────────────────────────────────────────────────────
  if (step === "researching") {
    return (
      <main className="relative z-10 max-w-xl mx-auto px-6 py-12">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 p-12 text-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {pdfFile ? "Reading PDF + Researching..." : "Researching..."}
          </h2>
          <p className="text-gray-400 text-sm mb-1">
            <span className="text-white font-medium">{titleInput}</span>
          </p>
          <p className="text-gray-500 text-xs">
            {pdfFile
              ? `Extracting data from ${pdfFile.name} and cross-referencing with AI knowledge`
              : "AI is synthesizing exam details from internet knowledge"}
          </p>
        </div>
      </main>
    );
  }

  // ─── Step 3: Review & Publish ───────────────────────────────────────────────
  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setStep("input")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleResearch}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          title="Re-run AI research"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Re-research
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Review & Publish</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Sparkles className="w-4 h-4" />
            AI-filled — review and edit before publishing
          </div>
          {pdfFile && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <FileText className="w-3 h-3" />
              Data from PDF
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
          <h2 className="text-lg font-bold mb-6 text-indigo-300">Basic Info</h2>
          <div className="space-y-6">
            <Field label="Title *">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isPublishing}
                className={inputClass}
              />
            </Field>

            <Field label="Official Link">
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                disabled={isPublishing}
                className={inputClass}
              />
            </Field>

            <Field label="Summary">
              <textarea
                value={formData.ai_summary}
                onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                disabled={isPublishing}
                rows={3}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Exam Date">
                <input
                  type="date"
                  value={formData.exam_date}
                  onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                  disabled={isPublishing}
                  className={inputClass}
                />
              </Field>
              <Field label="Application Deadline">
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  disabled={isPublishing}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
          <h2 className="text-lg font-bold mb-6 text-indigo-300">
            Detail Fields (shown on exam page)
          </h2>
          <div className="space-y-6">
            <Field label="Job Summary">
              <textarea
                value={detailsData.what_is_the_update}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, what_is_the_update: e.target.value })
                }
                disabled={isPublishing}
                rows={4}
                className={textareaClass}
              />
            </Field>

            <Field
              label="Key Highlights"
              hint="One highlight per line — shown as bullet points on the exam card"
            >
              <textarea
                value={detailsData.direct_answer}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, direct_answer: e.target.value })
                }
                disabled={isPublishing}
                rows={4}
                placeholder={"17,727 vacancies\nDeadline: April 30\nGraduate eligible"}
                className={textareaClass}
              />
            </Field>

            <Field
              label="Important Dates"
              hint='JSON object, e.g. {"Application Start": "01 Apr 2025", "Last Date": "30 Apr 2025"}'
            >
              <textarea
                value={detailsData.important_dates}
                onChange={(e) => {
                  setDetailsData({ ...detailsData, important_dates: e.target.value });
                  setImportantDatesError(null);
                }}
                disabled={isPublishing}
                rows={5}
                className={textareaClass}
                placeholder='{"Application Start": "01 Apr 2025"}'
              />
              {importantDatesError && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {importantDatesError}
                </div>
              )}
            </Field>

            <Field label="Application Fee">
              <textarea
                value={detailsData.application_fee}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, application_fee: e.target.value })
                }
                disabled={isPublishing}
                rows={3}
                className={textareaClass}
              />
            </Field>

            <Field label="Vacancy Details">
              <textarea
                value={detailsData.vacancies}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, vacancies: e.target.value })
                }
                disabled={isPublishing}
                rows={3}
                className={textareaClass}
              />
            </Field>

            <Field label="Age Limit">
              <input
                type="text"
                value={detailsData.age_limit}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, age_limit: e.target.value })
                }
                disabled={isPublishing}
                className={inputClass}
              />
            </Field>

            <Field label="Eligibility & Criteria">
              <textarea
                value={detailsData.eligibility}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, eligibility: e.target.value })
                }
                disabled={isPublishing}
                rows={4}
                className={textareaClass}
              />
            </Field>

            <Field label="Selection Process">
              <textarea
                value={detailsData.selection_process}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, selection_process: e.target.value })
                }
                disabled={isPublishing}
                rows={3}
                className={textareaClass}
              />
            </Field>

            <Field label="How to Apply">
              <textarea
                value={detailsData.how_to_apply}
                onChange={(e) =>
                  setDetailsData({ ...detailsData, how_to_apply: e.target.value })
                }
                disabled={isPublishing}
                rows={4}
                className={textareaClass}
              />
            </Field>
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={isPublishing || !formData.title.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isPublishing ? "Publishing..." : "Publish Notification"}
        </button>
      </div>
    </main>
  );
}

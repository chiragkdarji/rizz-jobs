"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Trash2,
  Upload,
  Loader2,
  Image,
  Sparkles,
  X,
  Plus,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const textareaClass =
  "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-600 focus:border-indigo-500/60 focus:bg-white/[0.06] focus:outline-none transition-all disabled:opacity-50 font-mono text-sm leading-relaxed resize-y";
const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-600 focus:border-indigo-500/60 focus:bg-white/[0.06] focus:outline-none transition-all disabled:opacity-50 text-sm";

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
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-600 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-4 border-b border-white/5">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-black shrink-0 mt-0.5">
        {number}
      </span>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}


export default function EditNotificationPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [isActive, setIsActive] = useState(true);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [importantDatesError, setImportantDatesError] = useState<string | null>(null);

  // Banner
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    link: "",
    ai_summary: "",
    exam_date: "",
    deadline: "",
  });

  const [detailsData, setDetailsData] = useState({
    what_is_the_update: "",
    important_dates: "",
    application_fee: "",
    vacancies: "",
    age_limit: "",
    eligibility: "",
    selection_process: "",
    how_to_apply: "",
    direct_answer: "",
  });

  const [faqsData, setFaqsData] = useState<Array<{ q: string; a: string }>>([]);

  const handleToggleActive = async () => {
    setIsTogglingActive(true);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setIsActive((prev) => !prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleGenerateBanner = async () => {
    setIsGeneratingBanner(true);
    setBannerError(null);
    try {
      const res = await fetch(`/api/admin/notifications/${id}/generate-banner`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error((d as { error?: string }).error || "Generation failed");
      setBannerUrl((d as { url: string }).url);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Banner generation failed");
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    setBannerError(null);
    try {
      // 1. Get presigned URL from Supabase via a simple server endpoint
      // SEO-friendly filename: {slug}-government-job-notification.{ext}
      const ext = file.name.split(".").pop() ?? "webp";
      const safeSlug = (formData.slug || id).replace(/[^a-z0-9-]/g, "-").toLowerCase();
      const filePath = `banners/${safeSlug}-government-job-notification.${ext}`;
      const presignRes = await fetch(`/api/admin/notifications/${id}/banner-presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, contentType: file.type }),
      });
      const presignData = await presignRes.json() as { signedUrl?: string; error?: string };
      if (!presignRes.ok) throw new Error(presignData.error || "Presign failed");

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(presignData.signedUrl!, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // 3. Get public URL and save to notification
      const saveRes = await fetch(`/api/admin/notifications/${id}/banner-presign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      const saveData = await saveRes.json() as { url?: string; error?: string };
      if (!saveRes.ok) throw new Error(saveData.error || "Save failed");

      setBannerUrl(saveData.url!);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleRemoveBanner = async () => {
    if (!confirm("Remove the banner image?")) return;
    setBannerError(null);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visuals: { notification_image: null } }),
      });
      if (!res.ok) throw new Error("Failed to remove banner");
      setBannerUrl(null);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Remove failed");
    }
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/notifications/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setFormData({
          title: data.title ?? "",
          slug: data.slug ?? "",
          link: data.link ?? "",
          ai_summary: data.ai_summary ?? "",
          exam_date: data.exam_date ? data.exam_date.slice(0, 10) : "",
          deadline: data.deadline ? data.deadline.slice(0, 10) : "",
        });

        const d = data.details || {};
        setDetailsData({
          what_is_the_update:
            typeof d.what_is_the_update === "string"
              ? d.what_is_the_update
              : d.what_is_the_update ? JSON.stringify(d.what_is_the_update, null, 2) : "",
          important_dates:
            typeof d.important_dates === "string"
              ? d.important_dates
              : d.important_dates ? JSON.stringify(d.important_dates, null, 2) : "",
          application_fee:
            typeof d.application_fee === "string"
              ? d.application_fee
              : d.application_fee ? JSON.stringify(d.application_fee, null, 2) : "",
          vacancies:
            typeof d.vacancies === "string"
              ? d.vacancies
              : d.vacancies !== undefined && d.vacancies !== null
                ? JSON.stringify(d.vacancies, null, 2) : "",
          age_limit:
            d.age_limit !== undefined && d.age_limit !== null ? String(d.age_limit) : "",
          eligibility:
            typeof d.eligibility === "string"
              ? d.eligibility
              : d.eligibility ? JSON.stringify(d.eligibility, null, 2) : "",
          selection_process:
            typeof d.selection_process === "string"
              ? d.selection_process
              : Array.isArray(d.selection_process) ? d.selection_process.join("\n") : "",
          how_to_apply:
            typeof d.how_to_apply === "string"
              ? d.how_to_apply
              : Array.isArray(d.how_to_apply) ? d.how_to_apply.join("\n") : "",
          direct_answer: (() => {
            const da = d.direct_answer;
            if (!da) return "";
            if (Array.isArray(da)) return da.join("\n");
            if (typeof da === "string") {
              try { return (JSON.parse(da) as string[]).join("\n"); } catch { return da; }
            }
            return "";
          })(),
        });

        if (data.visuals?.notification_image) {
          setBannerUrl(data.visuals.notification_image);
        }
        setIsActive(data.is_active !== false);

        if (Array.isArray(d.faqs)) {
          setFaqsData(
            (d.faqs as Array<{ q?: string; a?: string }>).map((f) => ({
              q: f.q || "",
              a: f.a || "",
            }))
          );
        }
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    let parsedImportantDates: Record<string, string> | undefined;
    if (detailsData.important_dates.trim()) {
      try {
        parsedImportantDates = JSON.parse(detailsData.important_dates);
        setImportantDatesError(null);
      } catch {
        setImportantDatesError("Invalid JSON — fix before saving");
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const tryParse = (s: string): unknown => {
      const t = s.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try { return JSON.parse(t); } catch { /* keep as string */ }
      }
      return s;
    };

    const details: Record<string, unknown> = {};
    if (detailsData.what_is_the_update.trim())
      details.what_is_the_update = detailsData.what_is_the_update;
    if (parsedImportantDates) details.important_dates = parsedImportantDates;
    if (detailsData.application_fee.trim())
      details.application_fee = tryParse(detailsData.application_fee);
    if (detailsData.vacancies.trim()) details.vacancies = tryParse(detailsData.vacancies);
    if (detailsData.age_limit.trim()) details.age_limit = detailsData.age_limit;
    if (detailsData.eligibility.trim())
      details.eligibility = tryParse(detailsData.eligibility);
    if (detailsData.selection_process.trim())
      details.selection_process = detailsData.selection_process;
    if (detailsData.how_to_apply.trim()) details.how_to_apply = detailsData.how_to_apply;
    const validFaqs = faqsData.filter((f) => f.q.trim() || f.a.trim());
    if (validFaqs.length > 0) details.faqs = validFaqs;
    const directAnswerLines = detailsData.direct_answer
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (directAnswerLines.length > 0) details.direct_answer = directAnswerLines;

    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, details }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Failed to save");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this notification? This cannot be undone.")) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Failed to delete");
      }
      router.push("/admin/notifications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setIsDeleting(false);
    }
  };

  const ActionButtons = () => (
    <div className="flex gap-3">
      <button
        onClick={handleSave}
        disabled={isSaving || isDeleting || !formData.title}
        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
      <button
        onClick={handleDelete}
        disabled={isSaving || isDeleting}
        className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-5 h-5" />
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );

  return (
    <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
      <Link
        href="/admin/notifications"
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notifications
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Admin · Edit Notification</p>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
            {isLoading ? "Loading…" : formData.title || "Untitled Notification"}
          </h1>
        </div>
        {!isLoading && (
          <a
            href={`/exam/${formData.slug || id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-medium mt-1"
            title="View on site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View live
          </a>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          ✓ Changes saved successfully!
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-8 lg:space-y-0">

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div className="space-y-8">

          {/* ── Status Toggle ────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all ${
            isActive
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-white/[0.03] border-white/10"
          }`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Visibility</p>
              <p className="text-sm font-medium text-white">
                {isActive ? "Live — visible to all users" : "Hidden from the public site"}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={isTogglingActive}
              className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                  : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 border border-gray-500/30"
              }`}
            >
              {isTogglingActive ? "Updating…" : isActive ? "Active" : "Inactive"}
            </button>
          </div>

          {/* ── Banner ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
            <SectionHeader number="1" title="Banner Image" subtitle="Shown at the top of the notification card and detail page" />

            {bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt="Notification banner"
                className="w-full rounded-xl mb-4 border border-white/10 object-cover"
                style={{ aspectRatio: "16/9" }}
              />
            )}

            {bannerError && (
              <div className="mb-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {bannerError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerateBanner}
                disabled={isGeneratingBanner || isUploadingBanner || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGeneratingBanner ? "Generating…" : bannerUrl ? "Regenerate Banner" : "Generate Banner with AI"}
              </button>

              {/* Manual upload */}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleBannerUpload}
              />
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={isGeneratingBanner || isUploadingBanner || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploadingBanner ? "Uploading…" : "Upload Image"}
              </button>

              {bannerUrl && (
                <button
                  onClick={handleRemoveBanner}
                  disabled={isGeneratingBanner || isUploadingBanner || isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Image
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              AI: Uses Gemini · requires GEMINI_API_KEY &nbsp;|&nbsp; Upload: PNG, JPG, WebP
            </p>
          </div>

          {/* ── Basic Fields ─────────────────────────────────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
            <SectionHeader number="2" title="Basic Info" subtitle="Core fields shown on cards and used for SEO" />
            <div className="space-y-5">
              <Field label="Title *">
                <input type="text" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>
              <Field label="URL Slug" hint="Auto-generated from title — edit only if needed">
                <input type="text" value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>
              <Field label="Official Link *">
                <input type="url" value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  disabled={isSaving} className={inputClass} placeholder="https://..." />
              </Field>
              <Field label="AI Summary" hint="1–2 sentence summary shown on the card and detail page hero">
                <textarea value={formData.ai_summary}
                  onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                  disabled={isSaving} rows={3} className={textareaClass} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Exam Date">
                  <input type="date" value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    disabled={isSaving} className={inputClass} />
                </Field>
                <Field label="Application Deadline">
                  <input type="date" value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    disabled={isSaving} className={inputClass} />
                </Field>
              </div>
            </div>
          </div>

          <ActionButtons />

          </div>{/* end left column */}

          {/* ── RIGHT COLUMN ────────────────────────────────── */}
          <div className="space-y-8">

          {/* ── Details Fields ────────────────────────────────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
            <SectionHeader number="3" title="Detail Content" subtitle="Shown on the full notification page" />
            <div className="space-y-5">

              <Field label="Key Highlights" hint="One highlight per line — shown as chips below the title (e.g. '17,727 vacancies', 'Deadline: 30 Apr', 'Graduate eligible')">
                <textarea value={detailsData.direct_answer}
                  onChange={(e) => setDetailsData({ ...detailsData, direct_answer: e.target.value })}
                  disabled={isSaving} rows={4} className={textareaClass}
                  placeholder={"17,727 vacancies\nDeadline: 30 Apr 2026\nGraduate eligible\nAge: 18–35 years"} />
              </Field>

              <Field label="Job Summary" hint="Rich text — bold, italic, bullet lists, and links supported">
                <RichTextEditor
                  value={detailsData.what_is_the_update}
                  onChange={(html) => setDetailsData({ ...detailsData, what_is_the_update: html })}
                  disabled={isSaving}
                  minRows={6}
                  placeholder="Describe this exam notification…"
                />
              </Field>

              <Field label="Important Dates"
                hint='JSON object, e.g. {"Application Start": "01 Apr 2025", "Last Date": "30 Apr 2025"}'>
                <textarea value={detailsData.important_dates}
                  onChange={(e) => {
                    setDetailsData({ ...detailsData, important_dates: e.target.value });
                    setImportantDatesError(null);
                  }}
                  disabled={isSaving} rows={5} className={textareaClass}
                  placeholder='{"Application Start": "01 Apr 2025"}' />
                {importantDatesError && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {importantDatesError}
                  </div>
                )}
              </Field>

              <Field label="Application Fee">
                <textarea value={detailsData.application_fee}
                  onChange={(e) => setDetailsData({ ...detailsData, application_fee: e.target.value })}
                  disabled={isSaving} rows={3} className={textareaClass} />
              </Field>

              <Field label="Vacancy Details">
                <textarea value={detailsData.vacancies}
                  onChange={(e) => setDetailsData({ ...detailsData, vacancies: e.target.value })}
                  disabled={isSaving} rows={3} className={textareaClass} />
              </Field>

              <Field label="Age Limit">
                <input type="text" value={detailsData.age_limit}
                  onChange={(e) => setDetailsData({ ...detailsData, age_limit: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>

              <Field label="Eligibility & Criteria">
                <textarea value={detailsData.eligibility}
                  onChange={(e) => setDetailsData({ ...detailsData, eligibility: e.target.value })}
                  disabled={isSaving} rows={4} className={textareaClass} />
              </Field>

              <Field label="Selection Process">
                <textarea value={detailsData.selection_process}
                  onChange={(e) => setDetailsData({ ...detailsData, selection_process: e.target.value })}
                  disabled={isSaving} rows={3} className={textareaClass} />
              </Field>

              <Field label="How to Apply">
                <textarea value={detailsData.how_to_apply}
                  onChange={(e) => setDetailsData({ ...detailsData, how_to_apply: e.target.value })}
                  disabled={isSaving} rows={4} className={textareaClass} />
              </Field>

              {/* ── FAQ Editor ─────────────────────────────── */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">FAQs</label>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Shown as an accordion on the detail page.
                </p>
                <div className="space-y-3 mb-3">
                  {faqsData.map((faq, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 mt-2 w-5 shrink-0 text-right">{idx + 1}.</span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Question"
                            value={faq.q}
                            onChange={(e) => {
                              const next = [...faqsData];
                              next[idx] = { ...next[idx], q: e.target.value };
                              setFaqsData(next);
                            }}
                            disabled={isSaving}
                            className={inputClass}
                          />
                          <textarea
                            placeholder="Answer"
                            value={faq.a}
                            onChange={(e) => {
                              const next = [...faqsData];
                              next[idx] = { ...next[idx], a: e.target.value };
                              setFaqsData(next);
                            }}
                            disabled={isSaving}
                            rows={2}
                            className={textareaClass}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFaqsData(faqsData.filter((_, i) => i !== idx))}
                          className="mt-1 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFaqsData([...faqsData, { q: "", a: "" }])}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add FAQ
                </button>
              </div>
            </div>
          </div>

          <ActionButtons />

          </div>{/* end right column */}
        </div>
      )}
    </main>
  );
}

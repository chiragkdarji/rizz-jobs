"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  FileText,
  Trash2,
  Upload,
  Loader2,
  Image,
  Sparkles,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const textareaClass =
  "w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50 font-mono text-sm";
const inputClass =
  "w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50";

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

const DOC_TYPE_LABELS: Record<string, string> = {
  official_notification: "Official Notification",
  admit_card: "Admit Card",
  result: "Result",
  syllabus: "Syllabus",
  answer_key: "Answer Key",
  other: "Other",
};

interface NotificationDocument {
  id: string;
  file_name: string;
  display_name?: string;
  file_url: string;
  document_type: string;
  file_size_bytes: number;
  scraped: boolean;
  created_at: string;
}

export default function EditNotificationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [isSaving, setIsSaving] = useState(false);
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

  // Documents
  const [documents, setDocuments] = useState<NotificationDocument[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("official_notification");
  const [docTitle, setDocTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  });

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/notifications/${id}/documents`);
      if (res.ok) setDocuments(await res.json());
    } catch { /* non-blocking */ }
  };

  // Presigned upload — file goes Browser → Supabase directly (bypasses Vercel 4.5 MB limit)
  const handleDocUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setIsUploadingDocs(true);
    setDocUploadError(null);
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        setUploadProgress(`Uploading ${file.name}…`);

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "doc", "docx"].includes(ext || "")) {
          errors.push(`${file.name}: Only PDF/DOC files allowed`);
          continue;
        }

        // 1. Get presigned URL (tiny API call — no file bytes through Vercel)
        const presignRes = await fetch(`/api/admin/notifications/${id}/documents/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, document_type: selectedDocType }),
        });

        if (!presignRes.ok) {
          const d = await presignRes.json().catch(() => ({}));
          errors.push(`${file.name}: ${(d as { error?: string }).error || "Presign failed"}`);
          continue;
        }

        const { signedUrl, storagePath } = (await presignRes.json()) as {
          signedUrl: string;
          storagePath: string;
        };

        // 2. PUT directly to Supabase Storage — bypasses Vercel entirely
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/pdf" },
        });

        if (!uploadRes.ok) {
          errors.push(`${file.name}: Storage upload failed (${uploadRes.status})`);
          continue;
        }

        // 3. Register doc in DB
        const regRes = await fetch(`/api/admin/notifications/${id}/documents/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            filename: file.name,
            document_type: selectedDocType,
            display_name: docTitle.trim() || null,
            file_size_bytes: file.size,
          }),
        });

        if (!regRes.ok) {
          const d = await regRes.json().catch(() => ({}));
          errors.push(`${file.name}: ${(d as { error?: string }).error || "Register failed"}`);
        }
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "Upload failed"}`);
      }
    }

    setUploadProgress(null);
    if (errors.length) setDocUploadError(errors.join(" | "));
    await fetchDocuments();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDocTitle("");
    setIsUploadingDocs(false);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await fetch(`/api/admin/notifications/${id}/documents/${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch { /* ignore */ }
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
      const filePath = `banners/banner_${id}_${Date.now()}.${file.name.split(".").pop()}`;
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
    fetchDocuments();
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
        });

        if (data.visuals?.notification_image) {
          setBannerUrl(data.visuals.notification_image);
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

  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <Link
        href="/admin/notifications"
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notifications
      </Link>

      <h1 className="text-4xl font-black mb-8">Edit Notification</h1>

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
        <div className="space-y-8">

          {/* ── Banner ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-4 text-indigo-300 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Banner Image
            </h2>

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
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-6 text-indigo-300">Basic Info</h2>
            <div className="space-y-6">
              <Field label="Title *">
                <input type="text" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>
              <Field label="Slug">
                <input type="text" value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>
              <Field label="Official Link *">
                <input type="url" value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  disabled={isSaving} className={inputClass} />
              </Field>
              <Field label="Summary (ai_summary)">
                <textarea value={formData.ai_summary}
                  onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                  disabled={isSaving} rows={3} className={inputClass} />
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

          {/* ── Details Fields ────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-6 text-indigo-300">
              Detail Fields (shown on exam page)
            </h2>
            <div className="space-y-6">

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
            </div>
          </div>

          {/* ── Documents ────────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-6 text-indigo-300">Documents (PDFs)</h2>

            {documents.length > 0 && (
              <div className="mb-6 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-indigo-300 truncate block">
                        {doc.display_name || doc.file_name}
                      </a>
                      <span className="text-xs text-gray-500">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        {doc.scraped && " · Auto-scraped"}
                        {doc.file_size_bytes && ` · ${(doc.file_size_bytes / 1024).toFixed(0)} KB`}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-400 hover:text-red-300 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Document Title (shown to users)</label>
                <input type="text" placeholder="e.g. Official Notification PDF, Admit Card 2026"
                  value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Document Type</label>
                  <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none">
                    {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-gray-900">{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Files (PDF/DOC — no size limit)</label>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx"
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer" />
                </div>
              </div>

              {uploadProgress && (
                <div className="flex items-center gap-2 text-xs text-indigo-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {uploadProgress}
                </div>
              )}

              {docUploadError && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {docUploadError}
                </div>
              )}

              <button onClick={handleDocUpload} disabled={isUploadingDocs}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50">
                {isUploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploadingDocs ? "Uploading..." : "Upload Documents"}
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={isSaving || !formData.title}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </main>
  );
}

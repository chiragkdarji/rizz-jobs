"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

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

export default function EditNotificationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [importantDatesError, setImportantDatesError] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    link: "",
    ai_summary: "",
    exam_date: "",
    deadline: "",
  });

  // details sub-fields (stored as plain text)
  const [detailsData, setDetailsData] = useState({
    what_is_the_update: "",
    important_dates: "", // JSON string of key-value pairs
    application_fee: "",
    vacancies: "",
    age_limit: "",
    eligibility: "",
    selection_process: "",
    how_to_apply: "",
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/notifications/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Error ${res.status}`);
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
          what_is_the_update: d.what_is_the_update ?? "",
          important_dates: d.important_dates
            ? JSON.stringify(d.important_dates, null, 2)
            : "",
          application_fee:
            typeof d.application_fee === "string"
              ? d.application_fee
              : d.application_fee
                ? JSON.stringify(d.application_fee, null, 2)
                : "",
          vacancies: d.vacancies ?? "",
          age_limit: d.age_limit ?? "",
          eligibility:
            typeof d.eligibility === "string"
              ? d.eligibility
              : d.eligibility
                ? JSON.stringify(d.eligibility, null, 2)
                : "",
          selection_process:
            typeof d.selection_process === "string"
              ? d.selection_process
              : Array.isArray(d.selection_process)
                ? d.selection_process.join("\n")
                : "",
          how_to_apply:
            typeof d.how_to_apply === "string"
              ? d.how_to_apply
              : Array.isArray(d.how_to_apply)
                ? d.how_to_apply.join("\n")
                : "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async () => {
    // Validate important_dates JSON before saving
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

    // Build the details object, only include non-empty values
    const details: Record<string, unknown> = {};
    if (detailsData.what_is_the_update.trim())
      details.what_is_the_update = detailsData.what_is_the_update;
    if (parsedImportantDates) details.important_dates = parsedImportantDates;
    if (detailsData.application_fee.trim())
      details.application_fee = detailsData.application_fee;
    if (detailsData.vacancies.trim()) details.vacancies = detailsData.vacancies;
    if (detailsData.age_limit.trim()) details.age_limit = detailsData.age_limit;
    if (detailsData.eligibility.trim())
      details.eligibility = detailsData.eligibility;
    if (detailsData.selection_process.trim())
      details.selection_process = detailsData.selection_process;
    if (detailsData.how_to_apply.trim())
      details.how_to_apply = detailsData.how_to_apply;

    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, details }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save");
      }
      setSuccess(true);
      setTimeout(() => router.push("/admin/notifications"), 1500);
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
          ✓ Saved! Redirecting...
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-8">
          {/* Basic Fields */}
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-6 text-indigo-300">
              Basic Info
            </h2>
            <div className="space-y-6">
              <Field label="Title *">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={isSaving}
                  className={inputClass}
                />
              </Field>

              <Field label="Slug">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  disabled={isSaving}
                  className={inputClass}
                />
              </Field>

              <Field label="Official Link *">
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  disabled={isSaving}
                  className={inputClass}
                />
              </Field>

              <Field label="Summary (ai_summary)">
                <textarea
                  value={formData.ai_summary}
                  onChange={(e) =>
                    setFormData({ ...formData, ai_summary: e.target.value })
                  }
                  disabled={isSaving}
                  rows={3}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Exam Date">
                  <input
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) =>
                      setFormData({ ...formData, exam_date: e.target.value })
                    }
                    disabled={isSaving}
                    className={inputClass}
                  />
                </Field>
                <Field label="Application Deadline">
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    disabled={isSaving}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Details Fields */}
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
            <h2 className="text-lg font-bold mb-6 text-indigo-300">
              Detail Fields (shown on exam page)
            </h2>
            <div className="space-y-6">
              <Field label="Job Summary">
                <textarea
                  value={detailsData.what_is_the_update}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      what_is_the_update: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={4}
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
                    setDetailsData({
                      ...detailsData,
                      important_dates: e.target.value,
                    });
                    setImportantDatesError(null);
                  }}
                  disabled={isSaving}
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
                    setDetailsData({
                      ...detailsData,
                      application_fee: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field label="Vacancy Details">
                <textarea
                  value={detailsData.vacancies}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      vacancies: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field label="Age Limit">
                <input
                  type="text"
                  value={detailsData.age_limit}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      age_limit: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  className={inputClass}
                />
              </Field>

              <Field label="Eligibility & Criteria">
                <textarea
                  value={detailsData.eligibility}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      eligibility: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={4}
                  className={textareaClass}
                />
              </Field>

              <Field label="Selection Process">
                <textarea
                  value={detailsData.selection_process}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      selection_process: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field label="How to Apply">
                <textarea
                  value={detailsData.how_to_apply}
                  onChange={(e) =>
                    setDetailsData({
                      ...detailsData,
                      how_to_apply: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={4}
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !formData.title}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </main>
  );
}

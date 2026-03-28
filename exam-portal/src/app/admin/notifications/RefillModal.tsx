"use client";

import { useState } from "react";
import { X, Sparkles, CheckCircle, AlertCircle, Loader2, Check } from "lucide-react";

interface NotificationRow {
  id: string;
  title: string;
  link: string;
  ai_summary: string;
  exam_date: string | null;
  deadline: string | null;
  details: Record<string, unknown> | null;
}

interface FieldDiff {
  key: string;
  label: string;
  currentVal: string;
  proposedVal: string;
  accepted: boolean;
  edited: string;
  isTopLevel: boolean; // true = patch top-level field; false = patch inside details
  detailsKey?: string; // key inside details object
}

function stringify(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(String).join("\n");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${val}`)
      .join("\n");
  }
  return String(v);
}

function isDifferent(a: string, b: string): boolean {
  return a.trim() !== b.trim() && b.trim() !== "";
}

function buildDiffs(
  current: NotificationRow,
  proposed: Record<string, unknown>
): FieldDiff[] {
  const proposedDetails = (proposed.details ?? {}) as Record<string, unknown>;
  const currentDetails = (current.details ?? {}) as Record<string, unknown>;

  const topFields: Array<{ key: keyof NotificationRow; label: string }> = [
    { key: "ai_summary", label: "Summary" },
    { key: "exam_date",  label: "Exam Date" },
    { key: "deadline",   label: "Deadline" },
    { key: "link",       label: "Official Link" },
  ];

  const detailFields: Array<{ key: string; label: string }> = [
    { key: "what_is_the_update", label: "What's the Update" },
    { key: "vacancies",          label: "Vacancies" },
    { key: "eligibility",        label: "Eligibility" },
    { key: "age_limit",          label: "Age Limit" },
    { key: "application_fee",    label: "Application Fee" },
    { key: "important_dates",    label: "Important Dates" },
    { key: "selection_process",  label: "Selection Process" },
    { key: "how_to_apply",       label: "How to Apply" },
  ];

  const diffs: FieldDiff[] = [];

  for (const { key, label } of topFields) {
    const cur = stringify(current[key]);
    const prop = key === "link"
      ? stringify((proposed as Record<string, unknown>).official_link)
      : stringify((proposed as Record<string, unknown>)[key]);

    diffs.push({
      key,
      label,
      currentVal: cur,
      proposedVal: prop,
      accepted: isDifferent(cur, prop) && cur === "",
      edited: prop,
      isTopLevel: true,
    });
  }

  for (const { key, label } of detailFields) {
    const cur = stringify(currentDetails[key]);
    const prop = stringify(proposedDetails[key]);

    diffs.push({
      key,
      label,
      currentVal: cur,
      proposedVal: prop,
      accepted: isDifferent(cur, prop) && cur === "",
      edited: prop,
      isTopLevel: false,
      detailsKey: key,
    });
  }

  return diffs;
}

interface RefillModalProps {
  notification: { id: string; title: string };
  onClose: () => void;
  onSaved: () => void;
}

export default function RefillModal({ notification, onClose, onSaved }: RefillModalProps) {
  const [phase, setPhase] = useState<"idle" | "loading" | "review" | "saving" | "done">("idle");
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  const runResearch = async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/admin/notifications/${notification.id}/refill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");

      const built = buildDiffs(data.current as NotificationRow, data.proposed as Record<string, unknown>);
      setDiffs(built);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setPhase("idle");
    }
  };

  const toggle = (idx: number) => {
    setDiffs(d => d.map((f, i) => i === idx ? { ...f, accepted: !f.accepted } : f));
  };

  const editVal = (idx: number, val: string) => {
    setDiffs(d => d.map((f, i) => i === idx ? { ...f, edited: val } : f));
  };

  const save = async () => {
    const accepted = diffs.filter(f => f.accepted && f.edited.trim());
    if (!accepted.length) { onClose(); return; }

    setPhase("saving");
    setError(null);

    try {
      // Build patch payload
      const patch: Record<string, unknown> = {};
      const detailsPatch: Record<string, unknown> = {};
      let hasDetails = false;

      for (const f of accepted) {
        if (f.isTopLevel) {
          // Map link back to correct field name
          const fieldKey = f.key === "link" ? "link" : f.key;
          patch[fieldKey] = f.edited.trim();
        } else if (f.detailsKey) {
          detailsPatch[f.detailsKey] = f.edited.trim();
          hasDetails = true;
        }
      }

      if (hasDetails) {
        // Merge with existing details
        const res = await fetch(`/api/admin/notifications/${notification.id}`);
        if (res.ok) {
          const existing = await res.json() as { details?: Record<string, unknown> };
          patch.details = { ...(existing.details ?? {}), ...detailsPatch };
        } else {
          patch.details = detailsPatch;
        }
      }

      const patchRes = await fetch(`/api/admin/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || "Save failed");
      }

      setPhase("done");
      setTimeout(() => { onSaved(); onClose(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setPhase("review");
    }
  };

  const acceptedCount = diffs.filter(f => f.accepted).length;
  const changedCount  = diffs.filter(f => isDifferent(f.currentVal, f.proposedVal)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl bg-[#0e0e14] border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-purple-400 mb-1">AI Refill</p>
            <h2 className="font-black text-lg leading-tight line-clamp-1">{notification.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Idle — start button */}
          {phase === "idle" && (
            <div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  AI will research this notification using its current data as context, then show a
                  before/after diff. You choose which changes to apply.
                  <br />
                  <span className="text-gray-500">The existing summary, link, and details are automatically sent as context.</span>
                </p>
              </div>

              {/* Optional hint */}
              <div className="mb-5">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Extra context <span className="font-normal text-gray-600 normal-case tracking-normal">(optional — paste vacancy details, org name, source URL, etc.)</span>
                </label>
                <textarea
                  value={hint}
                  onChange={e => setHint(e.target.value)}
                  rows={4}
                  placeholder="e.g. This is from Assam Co-operative Apex Bank, 15 vacancies, not IBPS. Application portal: apexbankassam.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder-gray-600 focus:border-purple-500/50 focus:outline-none transition-colors resize-y"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button
                onClick={runResearch}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Research with AI
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === "loading" && (
            <div className="text-center py-14">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Researching with GPT-4o — this takes ~15 seconds…</p>
            </div>
          )}

          {/* Done */}
          {phase === "done" && (
            <div className="text-center py-14">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-400 font-bold">Changes saved!</p>
            </div>
          )}

          {/* Review diff table */}
          {(phase === "review" || phase === "saving") && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-bold">{changedCount}</span> field{changedCount !== 1 ? "s" : ""} changed ·{" "}
                  <span className="text-purple-400 font-bold">{acceptedCount}</span> selected to apply
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiffs(d => d.map(f => isDifferent(f.currentVal, f.proposedVal) ? { ...f, accepted: true } : f))}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition-all"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setDiffs(d => d.map(f => ({ ...f, accepted: false })))}
                    className="text-xs font-bold text-gray-400 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                  >
                    Reject All
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {diffs.map((f, idx) => {
                  const changed = isDifferent(f.currentVal, f.proposedVal);
                  return (
                    <div
                      key={f.key}
                      className={`rounded-xl border transition-all ${
                        f.accepted
                          ? "border-purple-500/40 bg-purple-500/5"
                          : changed
                          ? "border-white/10 bg-white/[0.02]"
                          : "border-white/5 bg-white/[0.01] opacity-50"
                      }`}
                    >
                      {/* Field header row */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
                        <button
                          onClick={() => changed && toggle(idx)}
                          disabled={!changed}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            f.accepted
                              ? "bg-purple-600 border-purple-500"
                              : "border-white/20 bg-transparent"
                          } ${!changed ? "cursor-default opacity-30" : "cursor-pointer"}`}
                        >
                          {f.accepted && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex-1">
                          {f.label}
                        </span>
                        {!changed && (
                          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No change</span>
                        )}
                        {changed && !f.accepted && (
                          <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">Changed</span>
                        )}
                        {changed && f.accepted && (
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Will apply</span>
                        )}
                      </div>

                      {/* Before / After */}
                      {changed && (
                        <div className="grid grid-cols-2 divide-x divide-white/5">
                          {/* Current */}
                          <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Current</p>
                            <p className="text-xs text-gray-500 whitespace-pre-wrap break-words leading-relaxed">
                              {f.currentVal || <span className="italic text-gray-700">empty</span>}
                            </p>
                          </div>
                          {/* Proposed — editable */}
                          <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500/70 mb-1.5">New (editable)</p>
                            <textarea
                              value={f.edited}
                              onChange={e => editVal(idx, e.target.value)}
                              rows={Math.max(2, f.edited.split("\n").length)}
                              className="w-full text-xs text-white bg-transparent resize-y focus:outline-none leading-relaxed placeholder-gray-700"
                              placeholder="Edit before applying…"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-white/5">
                <button
                  onClick={onClose}
                  disabled={phase === "saving"}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={phase === "saving" || acceptedCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phase === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                  {phase === "saving" ? "Saving…" : `Apply ${acceptedCount} Change${acceptedCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

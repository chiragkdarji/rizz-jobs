"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Plus, RotateCcw, Clock } from "lucide-react";

interface FieldChange {
  field: string;
  old: string;
  new: string;
}

interface ScraperRunEntry {
  title: string;
  slug: string;
  link?: string;
  changes?: FieldChange[];
}

interface ScraperRun {
  id: string;
  run_at: string;
  total_synced: number;
  new_count: number;
  updated_count: number;
  new_entries: ScraperRunEntry[];
  updated_entries: ScraperRunEntry[];
  status: "completed" | "failed";
  error_message?: string;
}

function RunCard({ run }: { run: ScraperRun }) {
  const [showNew, setShowNew] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);

  const runDate = new Date(run.run_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {run.status === "completed" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-white">{runDate} IST</p>
            {run.status === "failed" && run.error_message && (
              <p className="text-xs text-red-400 mt-0.5 font-mono">{run.error_message}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div className="text-center">
            <p className="text-xl font-black text-white">{run.total_synced}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-emerald-400">{run.new_count}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">New</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-indigo-400">{run.updated_count}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Updated</p>
          </div>
        </div>
      </div>

      {/* New entries */}
      {run.new_count > 0 && (
        <div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {run.new_count} new job{run.new_count !== 1 ? "s" : ""} posted
            {showNew ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showNew && (
            <div className="mt-2 space-y-1 pl-5 border-l border-emerald-500/20">
              {run.new_entries.map((e, i) => (
                <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-emerald-500/50 mt-0.5">•</span>
                  <div className="min-w-0">
                    <a
                      href={`/exam/${e.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-white transition-colors"
                    >
                      {e.title}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Updated entries */}
      {run.updated_count > 0 && (
        <div>
          <button
            onClick={() => setShowUpdated((v) => !v)}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {run.updated_count} existing entr{run.updated_count !== 1 ? "ies" : "y"} updated
            {showUpdated ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showUpdated && (
            <div className="mt-2 space-y-3 pl-5 border-l border-indigo-500/20">
              {run.updated_entries.map((e, i) => (
                <div key={i} className="text-xs">
                  <a
                    href={`/exam/${e.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 font-medium hover:text-white transition-colors"
                  >
                    {e.title}
                  </a>
                  {e.changes && e.changes.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {e.changes.map((c, j) => (
                        <div key={j} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                          <span className="text-indigo-400 font-mono font-bold">{c.field}</span>
                          {c.old && (
                            <div className="mt-1 flex gap-1.5 items-start">
                              <span className="text-red-500 font-bold shrink-0">−</span>
                              <span className="text-red-300/70 break-all">{c.old || <em className="opacity-50">empty</em>}</span>
                            </div>
                          )}
                          <div className="flex gap-1.5 items-start">
                            <span className="text-emerald-500 font-bold shrink-0">+</span>
                            <span className="text-emerald-300/80 break-all">{c.new || <em className="opacity-50">empty</em>}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-gray-600 italic">No tracked fields changed</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {run.status === "completed" && run.new_count === 0 && run.updated_count === 0 && (
        <p className="text-xs text-gray-500 italic">No changes — all discovered notifications were already up to date.</p>
      )}
    </div>
  );
}

export default function ScraperLogsPage() {
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scraper/logs");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setRuns(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRuns(); }, []);

  return (
    <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">Admin Panel</p>
          <h1 className="text-3xl font-black">Scraper Logs</h1>
          <p className="text-gray-500 text-sm mt-1">History of every automated scraper run</p>
        </div>
        <button
          onClick={loadRuns}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Clock className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No scraper runs logged yet.</p>
          <p className="text-xs mt-1">Trigger a scraper run to see logs here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </main>
  );
}

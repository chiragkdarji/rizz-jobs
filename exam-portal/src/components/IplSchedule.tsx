"use client";

import { useEffect, useState } from "react";
import { IPL_TEAMS } from "@/lib/cricapi";

interface ScheduleMatch {
  id: string;
  name: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: Array<{ name: string; shortname: string }>;
  venue?: string;
  status?: string;
  matchEnded?: boolean;
}

interface SeriesData {
  schedule: ScheduleMatch[];
}

function toIST(utcStr: string): string {
  try {
    const d = new Date(utcStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch { return ""; }
}

function calendarDate(utcStr: string): string {
  try {
    return new Date(utcStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch { return ""; }
}

function relativeDay(utcStr: string): "Today" | "Tomorrow" | null {
  try {
    const d = new Date(utcStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === new Date(now.getTime() + 86400000).toDateString()) return "Tomorrow";
    return null;
  } catch { return null; }
}

function getShort(teamInfo: Array<{ name: string; shortname: string }> | undefined, name: string): string {
  return teamInfo?.find((t) => t.name === name)?.shortname
    ?? name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

export default function IplSchedule() {
  const [matches, setMatches] = useState<ScheduleMatch[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ipl/series-data")
      .then((r) => r.json())
      .then((d: SeriesData & { error?: string }) => {
        if (d.schedule) setMatches(d.schedule);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="py-6 text-center" style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        <p style={{ color: "#9898aa", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          Schedule unavailable
        </p>
      </div>
    );
  }

  if (!matches) {
    return (
      <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-4 animate-pulse" style={{ borderBottom: i < 4 ? "1px solid #1a1a22" : undefined }}>
            <div className="space-y-2">
              <div style={{ height: "9px", width: "60px", backgroundColor: "#1e1e26", borderRadius: "2px" }} />
              <div style={{ height: "14px", width: "180px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
              <div style={{ height: "10px", width: "120px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="py-8 text-center" style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        <p style={{ color: "#9898aa", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          No upcoming fixtures
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
      {matches.map((m, idx) => {
        const t1 = m.teams?.[0] ?? "";
        const t2 = m.teams?.[1] ?? "";
        const s1 = getShort(m.teamInfo, t1);
        const s2 = getShort(m.teamInfo, t2);
        const m1 = IPL_TEAMS[s1];
        const m2 = IPL_TEAMS[s2];
        const relative = m.dateTimeGMT ? relativeDay(m.dateTimeGMT) : null;
        const calendar = m.dateTimeGMT ? calendarDate(m.dateTimeGMT) : (m.date ?? "");
        const time = m.dateTimeGMT ? toIST(m.dateTimeGMT) : "";
        const isToday = relative === "Today";

        return (
          <div
            key={m.id}
            className="px-4 py-4"
            style={{
              borderBottom: idx < matches.length - 1 ? "1px solid #1a1a22" : undefined,
              borderLeft: isToday ? "2px solid #f0a500" : "2px solid transparent",
            }}
          >
            {/* Date + time */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {relative && (
                <span
                  style={{
                    fontFamily: "var(--font-ui, system-ui, sans-serif)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isToday ? "#f0a500" : "#06b6d4",
                  }}
                >
                  {relative}
                </span>
              )}
              {relative && <span style={{ color: "#2a2a34", fontSize: "10px" }}>·</span>}
              <span
                style={{
                  fontFamily: "var(--font-ui, system-ui, sans-serif)",
                  fontSize: "10px",
                  fontWeight: relative ? 400 : 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: relative ? "#9898aa" : (isToday ? "#f0a500" : "#555466"),
                }}
              >
                {calendar}
              </span>
              {time && (
                <>
                  <span style={{ color: "#2a2a34", fontSize: "10px" }}>·</span>
                  <span style={{ color: "#9898aa", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                    {time}
                  </span>
                </>
              )}
            </div>

            {/* Teams */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: "30px", height: "30px", backgroundColor: m1?.bg ?? "#1e1e26", fontSize: "8px", fontWeight: 800, color: m1?.color ?? "#9898aa", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}
                >
                  {s1}
                </div>
                <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="hidden sm:block">
                  {t1}
                </span>
                <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="block sm:hidden">
                  {s1}
                </span>
              </div>

              <span style={{ color: "#9898aa", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>vs</span>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: "30px", height: "30px", backgroundColor: m2?.bg ?? "#1e1e26", fontSize: "8px", fontWeight: 800, color: m2?.color ?? "#9898aa", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}
                >
                  {s2}
                </div>
                <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="hidden sm:block">
                  {t2}
                </span>
                <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="block sm:hidden">
                  {s2}
                </span>
              </div>
            </div>

            {/* Venue */}
            {m.venue && (
              <p style={{ color: "#9898aa", fontSize: "11px", marginTop: "6px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="truncate">
                {m.venue}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

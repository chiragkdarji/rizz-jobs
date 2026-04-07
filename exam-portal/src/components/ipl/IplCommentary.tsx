"use client";

import { useEffect, useState } from "react";

// mcenter/v1/{id}/comm returns { comwrapper: [{ commentsData: [...] }], miniscore, ... }
interface CommentaryItem {
  ballNbr?: number;
  overNumber?: number;
  commText?: string;
  event?: string;
}

interface CommWrapper {
  commentsData?: CommentaryItem[];
}

interface Props {
  matchId: string;
  isLive?: boolean;
  initialComwrapper?: CommWrapper[];
}

const EVENT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  FOUR:   { bg: "#3B82F633", color: "#3B82F6", label: "4" },
  SIX:    { bg: "#D4AF3733", color: "#D4AF37", label: "6" },
  WICKET: { bg: "#EF444433", color: "#EF4444", label: "W" },
};

function flattenComments(wrappers: CommWrapper[]): CommentaryItem[] {
  return wrappers.flatMap((w) => w.commentsData ?? []);
}

function inferEvent(item: CommentaryItem): string | null {
  if (item.event) return item.event;
  const t = (item.commText ?? "").toUpperCase();
  if (t.includes("SIX")) return "SIX";
  if (t.includes("FOUR")) return "FOUR";
  if (t.includes("OUT") || t.includes("WICKET")) return "WICKET";
  return null;
}

function ballIndicatorStyle(event: string | null): { bg: string; color: string; label: string } {
  if (event === "WICKET") return { bg: "#EF444433", color: "#EF4444", label: "W" };
  if (event === "SIX") return { bg: "#D4AF3733", color: "#D4AF37", label: "6" };
  if (event === "FOUR") return { bg: "#3B82F633", color: "#3B82F6", label: "4" };
  return { bg: "#0E2235", color: "#6B86A0", label: "•" };
}

interface OverGroup {
  over: number;
  balls: CommentaryItem[];
}

function groupByOver(items: CommentaryItem[]): OverGroup[] {
  const map = new Map<number, CommentaryItem[]>();
  for (const item of items) {
    const ov = item.overNumber ?? -1;
    if (!map.has(ov)) map.set(ov, []);
    map.get(ov)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([over, balls]) => ({ over, balls }));
}

export default function IplCommentary({ matchId, isLive, initialComwrapper = [] }: Props) {
  const [items, setItems] = useState<CommentaryItem[]>(flattenComments(initialComwrapper));

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ipl/match/${matchId}/commentary`);
        if (res.ok) {
          const d = await res.json();
          setItems(flattenComments(d?.comwrapper ?? []));
        }
      } catch {/* silent */}
    }, 30000);
    return () => clearInterval(interval);
  }, [matchId, isLive]);

  const groups = groupByOver(items);

  return (
    <div>
      {groups.map(({ over, balls }) => {
        // Compute over summary
        let overRuns = 0;
        let overWkts = 0;
        for (const ball of balls) {
          const ev = inferEvent(ball);
          if (ev === "WICKET") overWkts++;
          // runs per ball — not reliably available in commText, skip for now
        }
        // Sum up runs from commText heuristic: "X runs" or "no run"
        for (const ball of balls) {
          const m = (ball.commText ?? "").match(/(\d+)\s+run/i);
          if (m) overRuns += parseInt(m[1], 10);
          else if (/no run/i.test(ball.commText ?? "")) overRuns += 0;
        }

        return (
          <div key={over}>
            {/* Over header */}
            {over >= 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 sticky top-0"
                style={{ background: "#040E1B", borderBottom: "1px solid #0E2235", borderTop: "1px solid #0E2235" }}
              >
                <span className="text-xs font-bold uppercase tracking-wide shrink-0" style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                  Over {over}
                </span>
                <div className="flex gap-1 ml-2">
                  {[...balls].reverse().map((ball, bi) => {
                    const ev = inferEvent(ball);
                    const s = ballIndicatorStyle(ev);
                    return (
                      <span
                        key={bi}
                        className="w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}` }}
                      >
                        {s.label}
                      </span>
                    );
                  })}
                </div>
                {(overRuns > 0 || overWkts > 0) && (
                  <span className="ml-auto text-xs shrink-0" style={{ color: "#6B86A0" }}>
                    {overRuns > 0 ? `${overRuns} runs` : ""}
                    {overRuns > 0 && overWkts > 0 ? " · " : ""}
                    {overWkts > 0 ? `${overWkts}W` : ""}
                  </span>
                )}
              </div>
            )}

            {/* Ball-by-ball items */}
            {balls.map((item, i) => {
              const ev = inferEvent(item);
              const style = ev ? EVENT_STYLE[ev] : null;
              return (
                <div key={i} className="flex gap-3 py-3 text-sm" style={{ borderBottom: "1px solid #0E2235" }}>
                  <div className="shrink-0 w-14 text-right" style={{ color: "#6B86A0", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                    {item.overNumber != null ? `${item.overNumber}.${item.ballNbr}` : "—"}
                  </div>
                  {style && (
                    <span className="shrink-0 w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center"
                      style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}` }}>
                      {style.label}
                    </span>
                  )}
                  {!style && <span className="shrink-0 w-6" />}
                  <p style={{ color: "#E8E4DC" }}>{item.commText}</p>
                </div>
              );
            })}
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: "#6B86A0" }}>No commentary available yet.</p>
      )}
    </div>
  );
}

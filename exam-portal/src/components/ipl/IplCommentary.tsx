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

  return (
    <div>
      {items.map((item, i) => {
        const style = item.event ? EVENT_STYLE[item.event] : null;
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
            <p style={{ color: "#E8E4DC" }}>{item.commText}</p>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: "#6B86A0" }}>No commentary available yet.</p>
      )}
    </div>
  );
}

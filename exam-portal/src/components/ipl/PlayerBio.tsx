"use client";
import { useState } from "react";

interface Props { text: string; }

const INITIAL_PARAS = 3;

export default function PlayerBio({ text }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Cricbuzz bios use <br/><br/> as paragraph separators
  const paragraphs = text.split(/<br\s*\/?>\s*<br\s*\/?>/i).filter((p) => p.trim().length > 0);
  const hasMore = paragraphs.length > INITIAL_PARAS;
  const visible = expanded ? paragraphs : paragraphs.slice(0, INITIAL_PARAS);
  const html = visible.join("<br/><br/>");

  return (
    <div>
      {/* dangerouslySetInnerHTML is intentional: content comes from Cricbuzz (trusted source), not user input */}
      <div
        className="text-sm leading-relaxed"
        style={{ color: "#9A96A0" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-semibold"
          style={{ color: "#FFB800" }}
        >
          {expanded ? "Read less" : `Read more`}
        </button>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";

export default function PlayerBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = text.slice(0, 300);
  const truncated = text.length > 300;
  return (
    <div>
      <p className="text-sm leading-relaxed" style={{ color: "#8BB0C8" }}>
        {expanded ? text : short + (truncated ? "..." : "")}
      </p>
      {truncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-semibold"
          style={{ color: "#D4AF37" }}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

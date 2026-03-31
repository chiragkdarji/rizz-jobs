"use client";

import { useState } from "react";

interface Props {
  url: string;
  headline: string;
  accent: string;
}

export default function ArticleShareBar({ url, headline, accent }: Props) {
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(headline);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    padding: "11px 16px",
    minHeight: "44px",
    border: "1px solid #1e1e24",
    color: "#7c7888",
    backgroundColor: "#0d0d10",
    transition: "color 0.15s, border-color 0.15s",
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div
      className="py-5 my-8"
      style={{ borderTop: "1px solid #1e1e24", borderBottom: "1px solid #1e1e24" }}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#7c7888" }}>
        Share this story
      </p>
      <div className="flex flex-wrap gap-2">
        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${text}%20${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          style={btnBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f2ede6";
            (e.currentTarget as HTMLElement).style.borderColor = "#25D366";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#7c7888";
            (e.currentTarget as HTMLElement).style.borderColor = "#1e1e24";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>

        {/* X / Twitter */}
        <a
          href={`https://twitter.com/intent/tweet?text=${text}&url=${encoded}&via=rizzjobs`}
          target="_blank"
          rel="noopener noreferrer"
          style={btnBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f2ede6";
            (e.currentTarget as HTMLElement).style.borderColor = "#1d9bf0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#7c7888";
            (e.currentTarget as HTMLElement).style.borderColor = "#1e1e24";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X / Twitter
        </a>

        {/* LinkedIn */}
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          style={btnBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f2ede6";
            (e.currentTarget as HTMLElement).style.borderColor = "#0a66c2";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#7c7888";
            (e.currentTarget as HTMLElement).style.borderColor = "#1e1e24";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </a>

        {/* Copy Link */}
        <button
          onClick={copy}
          style={{
            ...btnBase,
            color: copied ? accent : "#7c7888",
            borderColor: copied ? accent : "#1e1e24",
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

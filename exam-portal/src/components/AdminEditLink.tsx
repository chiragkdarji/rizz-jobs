"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Admin-only Edit link, resolved client-side so the exam page stays static (ISR).
 * Checking admin status on the server would require cookies(), which opts the
 * whole page out of caching and forces a render on every request.
 */
export function AdminEditLink({ notificationId }: { notificationId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Supabase auth cookies are named sb-<ref>-auth-token. No cookie means
    // anonymous visitor (or bot) — skip the network call entirely.
    if (!document.cookie.includes("sb-")) return;
    fetch("/api/auth/is-admin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.admin) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <Link
      href={`/admin/notifications/${notificationId}/edit`}
      className="shrink-0 mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 hover:text-white text-xs font-bold transition-all"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </Link>
  );
}

"""
Auto-triage the admin review queue so humans only see actionable rows.

Rules, applied to active rows with needs_url_review=true:
1. Deadline already passed: clear the flag. The recruitment is over; the page
   renders in its closed state (no Apply button) and needs no official link.
2. No dates at all AND older than 45 days: deactivate. Stale notification
   nobody can act on, with no official source found by registry, LLM or
   Google search - dead weight for users and for SEO.
3. Everything else (recent or still open): stays in the queue for a human.

Run:  python triage_review_queue.py --dry-run
      python triage_review_queue.py
"""

import argparse
from datetime import datetime, timedelta, timezone

from db import supabase

STALE_AFTER_DAYS = 45


def fetch_queue() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications")
             .select("id, title, deadline, exam_date, created_at")
             .eq("is_active", True).eq("needs_url_review", True)
             .order("created_at", desc=True).range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        off += 1000


def parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s[:19]).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def run(dry_run: bool) -> None:
    rows = fetch_queue()
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=STALE_AFTER_DAYS)

    closed, stale, keep = [], [], []
    for r in rows:
        deadline = parse_date(r.get("deadline"))
        exam_date = parse_date(r.get("exam_date"))
        created = parse_date(r.get("created_at")) or now
        if deadline and deadline < now:
            closed.append(r)
        elif not deadline and not exam_date and created < stale_cutoff:
            stale.append(r)
        else:
            keep.append(r)

    print(f"Review queue: {len(rows)} rows")
    print(f"  1. deadline passed -> clear flag:   {len(closed)}")
    print(f"  2. dateless + >45d -> deactivate:   {len(stale)}")
    print(f"  3. keep for human review:           {len(keep)}\n")

    if not dry_run:
        for r in closed:
            supabase.table("notifications").update(
                {"needs_url_review": False}
            ).eq("id", r["id"]).execute()
        for r in stale:
            supabase.table("notifications").update(
                {"is_active": False, "needs_url_review": False}
            ).eq("id", r["id"]).execute()

    print("Remaining for human review:")
    for r in keep:
        d = (r.get("deadline") or "no deadline")[:10]
        print(f"  - [{d}] {r['title'][:70]}")
    print(f"\nDone (dry_run={dry_run})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    run(ap.parse_args().dry_run)

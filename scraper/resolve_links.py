"""
Serper-powered link resolution for rows the deterministic cleanup could not fix.

Two passes, in priority order (each Serper query costs one API credit):
1. Flagged rows (needs_url_review=true, no link): find any valid official URL.
2. Homepage upgrades: rows whose link is a bare gov homepage AND whose
   application window is still open get a deep-link search; the homepage is
   kept when nothing better is found.

Run:  python resolve_links.py --dry-run
      python resolve_links.py
      python resolve_links.py --budget 400        # max Serper credits to spend
      python resolve_links.py --skip-upgrades     # pass 1 only
"""

import argparse
import re
from datetime import datetime, timezone

from db import supabase
from engine import search_official_url, extract_domain

GOV_DOMAINS = [".gov.in", ".nic.in", ".ac.in", ".edu.in", ".res.in"]
HOMEPAGE_RE = re.compile(r"^https?://[^/]+/?$")

# search_official_url tries up to 3 queries internally; budget conservatively.
CREDITS_PER_CALL = 2


def fetch_all_active() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications")
             .select("id, slug, title, link, deadline, needs_url_review")
             .eq("is_active", True).order("created_at", desc=True)
             .range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        off += 1000


def deadline_open(deadline: str | None) -> bool:
    if not deadline:
        return False
    try:
        return datetime.fromisoformat(deadline[:10]).replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
    except ValueError:
        return False


def run(dry_run: bool, budget: int, skip_upgrades: bool) -> None:
    rows = fetch_all_active()
    flagged = [r for r in rows if not r.get("link")]
    upgrades = [] if skip_upgrades else [
        r for r in rows
        if r.get("link") and HOMEPAGE_RE.match(r["link"].strip())
        and any(d in r["link"].lower() for d in GOV_DOMAINS)
        and deadline_open(r.get("deadline"))
    ]
    print(f"Pass 1 (flagged, no link): {len(flagged)} rows")
    print(f"Pass 2 (homepage upgrade, open applications): {len(upgrades)} rows")
    print(f"Budget: ~{budget} credits (~{budget // CREDITS_PER_CALL} searches)\n")

    spent = 0
    resolved = upgraded = 0

    def out_of_budget() -> bool:
        return spent + CREDITS_PER_CALL > budget

    for label, batch in (("flagged", flagged), ("upgrade", upgrades)):
        for row in batch:
            if out_of_budget():
                print(f"\n⛔ Budget reached after ~{spent} credits.")
                print(f"Done -- resolved={resolved} upgraded={upgraded} spent~={spent}")
                return
            if dry_run:
                continue
            spent += CREDITS_PER_CALL
            hint = extract_domain(row["link"]) if row.get("link") else None
            found = search_official_url(row["title"], hint_domain=hint)
            if not found:
                continue
            if label == "flagged":
                resolved += 1
                supabase.table("notifications").update(
                    {"link": found, "needs_url_review": False}
                ).eq("id", row["id"]).execute()
                print(f"  ✅ {row['title'][:55]} -> {found[:70]}")
            else:
                # Only replace the homepage when the result is a deeper path
                if not HOMEPAGE_RE.match(found.strip()) and found.rstrip("/") != row["link"].rstrip("/"):
                    upgraded += 1
                    supabase.table("notifications").update({"link": found}).eq("id", row["id"]).execute()
                    print(f"  ⬆️  {row['title'][:55]} -> {found[:70]}")

    print(f"\nDone -- resolved={resolved} upgraded={upgraded} spent~={spent} dry_run={dry_run}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--budget", type=int, default=1200, help="Max Serper credits to spend")
    ap.add_argument("--skip-upgrades", action="store_true")
    args = ap.parse_args()
    run(args.dry_run, args.budget, args.skip_upgrades)

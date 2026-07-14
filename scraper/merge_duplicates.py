"""
One-time duplicate merge for the notifications table.

1. Backfills entity_key for every active row (org+post+year, lifecycle-normalized).
2. Groups rows by entity_key; each group beyond the keeper is deactivated and
   given redirect_to=<keeper slug>. The exam page 301s these to the keeper.
3. Folds the losers' data into the keeper via smart_merge (never loses fields).

Run:  python merge_duplicates.py --dry-run
      python merge_duplicates.py
"""

import argparse
from collections import defaultdict

from db import supabase, compute_entity_key, smart_merge

SELECT = "id, slug, title, link, ai_summary, exam_date, deadline, details, created_at, entity_key, redirect_to"


def fetch_all_active() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications").select(SELECT)
             .eq("is_active", True).order("created_at", desc=True)
             .range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        off += 1000


def keeper_score(row: dict) -> tuple:
    link = (row.get("link") or "").lower()
    has_gov = any(d in link for d in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])
    is_search = "google.com/search" in link
    details = row.get("details") or {}
    has_body = isinstance(details, dict) and bool(details.get("what_is_the_update"))
    # Higher is better; oldest created_at last (likeliest indexed) -> negate string sort
    return (
        2 if (has_gov and not is_search) else (1 if link and not is_search else 0),
        1 if row.get("deadline") else 0,
        1 if has_body else 0,
        row.get("created_at") or "",  # newer wins ties on data, see note below
    )


def run(dry_run: bool) -> None:
    rows = fetch_all_active()
    print(f"Active rows: {len(rows)}")

    # Step 1: backfill entity_key everywhere it is missing/stale
    key_updates = 0
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = compute_entity_key(row["title"])
        if row.get("entity_key") != key:
            if not dry_run:
                supabase.table("notifications").update({"entity_key": key}).eq("id", row["id"]).execute()
            key_updates += 1
        row["entity_key"] = key
        groups[key].append(row)
    print(f"entity_key backfilled/updated: {key_updates}")

    # Step 2: merge duplicate groups
    dupe_groups = {k: v for k, v in groups.items() if len(v) > 1 and k.strip()}
    print(f"Duplicate groups: {len(dupe_groups)} "
          f"({sum(len(v) for v in dupe_groups.values()) - len(dupe_groups)} rows to merge)\n")

    merged = 0
    for key, group in sorted(dupe_groups.items(), key=lambda kv: -len(kv[1])):
        group.sort(key=keeper_score, reverse=True)
        keeper, losers = group[0], group[1:]
        print(f"[{key[:60]}]")
        print(f"  KEEP {keeper['slug'][:70]}")

        merged_record = dict(keeper)
        for loser in losers:
            merged_record = smart_merge(merged_record, loser)
            print(f"  fold {loser['slug'][:70]}")

        if not dry_run:
            update = {k: v for k, v in merged_record.items()
                      if k in ("link", "ai_summary", "exam_date", "deadline", "details")}
            supabase.table("notifications").update(update).eq("id", keeper["id"]).execute()
            for loser in losers:
                supabase.table("notifications").update(
                    {"is_active": False, "redirect_to": keeper["slug"]}
                ).eq("id", loser["id"]).execute()
        merged += len(losers)

    print(f"\nDone -- groups={len(dupe_groups)} rows_deactivated={merged} dry_run={dry_run}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    run(ap.parse_args().dry_run)

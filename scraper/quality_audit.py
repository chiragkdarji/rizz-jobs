"""
Data-quality gate for the notifications table.

Prints a scorecard and exits non-zero when any hard threshold is violated,
so CI turns red instead of quality rotting silently.

Run:  python quality_audit.py            # scorecard + gate
      python quality_audit.py --report   # scorecard only, always exit 0
"""

import argparse
import re
import sys
from collections import Counter

from db import supabase, compute_entity_key
from organizations import title_has_org_context

GOV_DOMAINS = [".gov.in", ".nic.in", ".ac.in", ".edu.in"]

# Hard gates: violate any of these and the run fails.
THRESHOLDS = {
    "google_search_links": 0,        # absolute count
    "org_less_title_pct": 25.0,      # % of active rows (legacy rows grandfathered)
    "duplicate_clusters": 10,        # entity_key clusters with >1 active row
    "gov_link_pct_min": 40.0,        # % of active rows with a gov-domain link
}


def fetch_all_active() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications")
             .select("id,title,slug,link,deadline,exam_date,entity_key")
             .eq("is_active", True).range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        off += 1000


def run(report_only: bool) -> None:
    rows = fetch_all_active()
    n = len(rows)
    if n == 0:
        sys.exit("No active rows found; refusing to pass an empty table.")

    google_links = sum(1 for r in rows if "google.com/search" in (r.get("link") or "").lower())
    gov_links = sum(1 for r in rows if any(d in (r.get("link") or "").lower() for d in GOV_DOMAINS))
    no_link = sum(1 for r in rows if not r.get("link"))
    no_dates = sum(1 for r in rows if not r.get("deadline") and not r.get("exam_date"))
    org_less = sum(1 for r in rows if not title_has_org_context(r["title"]))

    clusters = Counter(r.get("entity_key") or compute_entity_key(r["title"]) for r in rows)
    dupe_clusters = sum(1 for k, v in clusters.items() if v > 1 and k.strip())

    metrics = {
        "active_rows": n,
        "google_search_links": google_links,
        "gov_link_pct": round(100 * gov_links / n, 1),
        "no_link": no_link,
        "no_dates_pct": round(100 * no_dates / n, 1),
        "org_less_title_pct": round(100 * org_less / n, 1),
        "duplicate_clusters": dupe_clusters,
    }

    print("── Data Quality Scorecard ──────────────────────")
    for k, v in metrics.items():
        print(f"  {k:24} {v}")

    failures = []
    if google_links > THRESHOLDS["google_search_links"]:
        failures.append(f"google_search_links={google_links} (max {THRESHOLDS['google_search_links']})")
    if metrics["org_less_title_pct"] > THRESHOLDS["org_less_title_pct"]:
        failures.append(f"org_less_title_pct={metrics['org_less_title_pct']} (max {THRESHOLDS['org_less_title_pct']})")
    if dupe_clusters > THRESHOLDS["duplicate_clusters"]:
        failures.append(f"duplicate_clusters={dupe_clusters} (max {THRESHOLDS['duplicate_clusters']})")
    if metrics["gov_link_pct"] < THRESHOLDS["gov_link_pct_min"]:
        failures.append(f"gov_link_pct={metrics['gov_link_pct']} (min {THRESHOLDS['gov_link_pct_min']})")

    if failures:
        print("\n❌ QUALITY GATE FAILED:")
        for f in failures:
            print(f"  - {f}")
        if not report_only:
            sys.exit(1)
    else:
        print("\n✅ Quality gate passed.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true", help="Report only; never fail")
    run(ap.parse_args().report)

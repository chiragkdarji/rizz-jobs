"""
One-time link cleanup for the notifications table.

Targets, in order of severity:
1. Google-search links (old Tier-5 fallback): replaced with the org's official
   homepage when the org is resolvable from the title, else nulled + flagged.
2. Null links: same recovery attempt.
Gov-domain homepages already in the DB are left alone (honest fallbacks).

Recovery is deterministic (organizations registry), validated with an HTTP
check before writing. No search APIs involved.

Run:  python cleanup_links.py --dry-run
      python cleanup_links.py
"""

import argparse
import os
import re

from openai import OpenAI
from db import supabase
from engine import validate_url
from organizations import ORGANIZATIONS, find_org_in_title

SELECT = "id, slug, title, link"
GOV_TLDS = (".gov.in", ".nic.in", ".ac.in", ".edu.in", ".res.in")

_llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_llm_cache: dict[str, str | None] = {}


def homepage_via_llm(title: str) -> str | None:
    """
    Ask the LLM for the recruiting body's official homepage. Only accepted if
    the URL is on a government TLD AND responds over HTTP, so a hallucinated
    answer cannot reach the database.
    """
    key = title[:80]
    if key in _llm_cache:
        return _llm_cache[key]
    result = None
    try:
        resp = _llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": (
                    "Official website homepage URL of the government recruiting body for this "
                    f"Indian job notification: \"{title}\".\n"
                    "Answer with ONLY the homepage URL (https://...) or UNKNOWN. "
                    "It must be the organization's own official site, never a job portal."
                ),
            }],
            max_tokens=30,
            temperature=0,
        )
        ans = (resp.choices[0].message.content or "").strip().rstrip("/.")
        m = re.match(r"^https?://[^\s]+$", ans)
        if m and any(t in ans.lower() for t in GOV_TLDS) and validate_url(ans):
            result = ans
    except Exception as e:
        print(f"    LLM error: {e}")
    _llm_cache[key] = result
    return result

# canonical org -> validated homepage cache
_homepage_cache: dict[str, str | None] = {}


def org_homepage(org: str) -> str | None:
    """Return a validated official homepage for a canonical org name."""
    if org in _homepage_cache:
        return _homepage_cache[org]
    homepage = None
    for canonical, _aliases, domains in ORGANIZATIONS:
        if canonical != org:
            continue
        for d in domains:
            d = d.strip(".")
            if "." not in d or "/" in d:
                continue
            candidate = f"https://{d}" if d.startswith("www.") else f"https://www.{d}"
            for url in (f"https://{d}", candidate):
                if validate_url(url):
                    homepage = url
                    break
            if homepage:
                break
        break
    _homepage_cache[org] = homepage
    return homepage


def fetch_all_active() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications").select(SELECT)
             .eq("is_active", True).range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        off += 1000


def run(dry_run: bool) -> None:
    rows = fetch_all_active()
    targets = []
    for r in rows:
        link = (r.get("link") or "").strip()
        if not link or "google.com/search" in link.lower():
            targets.append(r)
    print(f"Active rows: {len(rows)} | bad links (search/null): {len(targets)}\n")

    recovered = flagged = 0
    for i, row in enumerate(targets, 1):
        org = find_org_in_title(row["title"])
        homepage = org_homepage(org) if org else None
        if not homepage:
            homepage = homepage_via_llm(row["title"])
        if homepage:
            recovered += 1
            print(f"[{i}/{len(targets)}] OK   {row['title'][:52]} -> {homepage}")
            if not dry_run:
                supabase.table("notifications").update(
                    {"link": homepage, "needs_url_review": False}
                ).eq("id", row["id"]).execute()
        else:
            flagged += 1
            print(f"[{i}/{len(targets)}] FLAG {row['title'][:60]}")
            if not dry_run:
                supabase.table("notifications").update(
                    {"link": None, "needs_url_review": True}
                ).eq("id", row["id"]).execute()

    print(f"\nDone -- recovered={recovered} flagged={flagged} dry_run={dry_run}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    run(ap.parse_args().dry_run)

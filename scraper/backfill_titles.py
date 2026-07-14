"""
One-time title normalization: every title must name its organization.

Tier 1 (free, deterministic): org resolved from the official link's domain.
Tier 2 (LLM, grounded): gpt-4o-mini extracts the org name from the row's own
        summary/details text. It may only answer with a name present in that
        text; otherwise UNKNOWN.
Rows that stay UNKNOWN keep their title and get needs_url_review=true so they
surface in the admin review queue. Slugs are never changed (they are URLs).

Run:  python backfill_titles.py --dry-run
      python backfill_titles.py
"""

import argparse
import json
import os
import time

from openai import OpenAI
from db import supabase, compute_entity_key
from organizations import find_org_in_title, title_has_org_context, org_from_url

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SELECT = "id, slug, title, link, ai_summary, details, seo"


def fetch_targets() -> list[dict]:
    rows, off = [], 0
    while True:
        r = (supabase.table("notifications").select(SELECT)
             .eq("is_active", True).order("created_at", desc=True)
             .range(off, off + 999).execute())
        page = r.data or []
        rows.extend(page)
        if len(page) < 1000:
            break
        off += 1000
    return [r for r in rows if not title_has_org_context(r["title"])]


def org_via_llm(row: dict) -> str | None:
    """Grounded extraction: the org must appear in the row's own text."""
    details = row.get("details") or {}
    context = json.dumps({
        "title": row["title"],
        "summary": (row.get("ai_summary") or "")[:600],
        "what_is_the_update": str(details.get("what_is_the_update", ""))[:800],
        "link": row.get("link") or "",
    }, ensure_ascii=False)
    prompt = f"""Which government organization/recruiting body is this Indian job notification from?

{context}

Rules:
- Answer with the organization's short common name (e.g. "UKPSC", "Rajasthan High Court", "AIIMS Delhi").
- The name MUST be stated or clearly implied in the text above. Do not guess from general knowledge.
- 1-6 words. If the text does not identify the organization, answer exactly: UNKNOWN

Answer:"""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20,
            temperature=0,
        )
        ans = (resp.choices[0].message.content or "").strip().strip('."')
        if not ans or ans.upper() == "UNKNOWN" or len(ans.split()) > 6:
            return None
        return ans
    except Exception as e:
        print(f"    LLM error: {e}")
        return None


def run(dry_run: bool, batch: int) -> None:
    targets = fetch_targets()
    if batch:
        targets = targets[:batch]
    print(f"Titles without org context: {len(targets)}\n")

    fixed_domain = fixed_llm = unknown = 0
    for i, row in enumerate(targets, 1):
        title = row["title"]
        org = org_from_url(row.get("link"))
        via = "domain"
        if not org:
            org = org_via_llm(row)
            via = "llm"
            time.sleep(0.1)

        if not org:
            unknown += 1
            print(f"[{i}/{len(targets)}] UNKNOWN  {title[:64]}")
            if not dry_run:
                supabase.table("notifications").update(
                    {"needs_url_review": True}
                ).eq("id", row["id"]).execute()
            continue

        # Avoid double-prefixing if the org text already leads the title
        if title.lower().startswith(org.lower()):
            new_title = title
        else:
            new_title = f"{org} {title}"

        if via == "domain":
            fixed_domain += 1
        else:
            fixed_llm += 1
        print(f"[{i}/{len(targets)}] {via:6}  {new_title[:70]}")

        if not dry_run and new_title != title:
            seo = row.get("seo") or {}
            if isinstance(seo, dict):
                mt = seo.get("meta_title") or ""
                if mt and not find_org_in_title(mt):
                    seo["meta_title"] = f"{org} {mt}"[:70]
            try:
                supabase.table("notifications").update({
                    "title": new_title,
                    "entity_key": compute_entity_key(new_title),
                    "seo": seo,
                }).eq("id", row["id"]).execute()
            except Exception as e:
                if "unique_notification" not in str(e):
                    raise
                # The corrected title already exists on another row: this row IS
                # a duplicate of it. Deactivate + redirect instead of retitling.
                dup = supabase.table("notifications").select("slug").eq(
                    "title", new_title
                ).neq("id", row["id"]).limit(1).execute()
                target = dup.data[0]["slug"] if dup.data else None
                supabase.table("notifications").update(
                    {"is_active": False, "redirect_to": target}
                ).eq("id", row["id"]).execute()
                print(f"    collision -> deactivated as duplicate of {target}")

    print(f"\nDone -- domain={fixed_domain} llm={fixed_llm} unknown={unknown} dry_run={dry_run}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--batch", type=int, default=0)
    args = ap.parse_args()
    run(args.dry_run, args.batch)

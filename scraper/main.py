"""
Rizz Jobs — Government Exam Scraper  (v2)
=========================================
Changes from v1:
  • URL validation: every AI-generated link is checked via HTTP before saving.
  • DuckDuckGo fallback: if AI URL is a 404, we search for the real gov.in page.
  • Org homepage fallback: working homepage beats a broken deep link.
  • 9 sources (was 4): added direct government portals + two more aggregators.
  • Deep research now returns exam_date / deadline / ai_summary at top level.
  • --refill mode: re-research existing notifications that are missing key fields.
  • --limit flag to cap how many titles are deep-researched per run (useful for testing).
"""

import asyncio
import argparse
import json
import os
import re
from difflib import SequenceMatcher
from urllib.parse import urlparse

from engine import fetch_page_content, validate_url, search_official_url, extract_domain
from parser import clean_html, parse_notifications, parse_exam_details, extract_pdf_links
from db import upsert_notifications, upload_notification_documents, fetch_categories
from image_gen import generate_banner
from dotenv import load_dotenv

load_dotenv()


# ─── Configuration ─────────────────────────────────────────────────────────────

MIN_VACANCIES = 10    # Skip postings with fewer vacancies than this
CURRENT_YEAR  = 2026
MIN_YEAR      = CURRENT_YEAR - 1  # Accept 2025 and 2026

# Aggregator domain fragments — never use these as the saved notification URL
AGGREGATOR_DOMAINS = [
    "sarkari", "freejobalert", "jagranjosh", "testbook",
    "rojgar", "freshersworld", "naukri", "shine.com",
    "indeed", "timesjobs", "recruitment.result",
    "govtjob", "sarkarijob", "latestjob", "indgovt",
]

# ─── Sources ─────────────────────────────────────────────────────────────────
# Includes original aggregators + direct government portals.
# Government portals are listed first so their URLs bubble up in consolidation.
SOURCES = [
    # ── Direct Government Portals (authoritative, highest-quality URLs) ──
    {"name": "UPSC",           "url": "https://upsc.gov.in/whats-new"},
    {"name": "SSC",            "url": "https://ssc.gov.in/"},
    {"name": "IBPS",           "url": "https://www.ibps.in/"},
    {"name": "EmploymentNews", "url": "https://employmentnews.gov.in/"},
    # ── High-quality aggregators ──────────────────────────────────────────
    {"name": "FreeJobAlert",   "url": "https://www.freejobalert.com/latest-notifications/"},
    {"name": "SarkariResult",  "url": "https://www.sarkariresult.com/latestjob/"},
    {"name": "SarkariExam",    "url": "https://www.sarkariexam.com/"},
    {"name": "JagranJosh",     "url": "https://www.jagranjosh.com/articles/government-jobs-exam-notifications-updates-1330335198-1"},
    {"name": "GovtJobsIndia",  "url": "https://www.govtjobsindia.in/latest-jobs/"},
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def titles_are_similar(a: str, b: str, threshold: float = 0.82) -> bool:
    a_norm = a.lower().strip()
    b_norm = b.lower().strip()
    if a_norm in b_norm or b_norm in a_norm:
        return True
    return SequenceMatcher(None, a_norm, b_norm).ratio() >= threshold


def find_similar_title(title: str, consolidated: dict) -> str | None:
    for key in consolidated:
        if titles_are_similar(title, key):
            return key
    return None


def generate_slug(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug[:120]


VAGUE_DATE_VALUES = {
    "", "none", "null", "n/a", "na", "tba", "tbd",
    "to be announced", "to be notified", "to be declared",
    "will be announced", "check official website",
}


def is_real_date(val) -> bool:
    """Return True if val looks like a real date (not empty/vague)."""
    if not val:
        return False
    s = str(val).strip().lower()
    return s not in VAGUE_DATE_VALUES and len(s) >= 6


def extract_max_vacancies(deep_data: dict) -> int | None:
    texts = []
    for item in deep_data.get("direct_answer", []):
        texts.append(str(item))
    v = deep_data.get("details", {}).get("vacancies", "")
    texts.append(json.dumps(v) if isinstance(v, dict) else str(v or ""))
    texts.append(deep_data.get("ai_summary", ""))
    numbers = []
    for text in texts:
        for m in re.findall(r"(\d[\d,]*)\s*(?:vacanc|post|seat|opening)", text, re.IGNORECASE):
            try:
                numbers.append(int(m.replace(",", "")))
            except ValueError:
                pass
    return max(numbers) if numbers else None


def _is_aggregator_url(url: str) -> bool:
    low = (url or "").lower()
    return any(agg in low for agg in AGGREGATOR_DOMAINS)


# ─── URL Resolution Pipeline ──────────────────────────────────────────────────

def resolve_best_url(
    title: str,
    ai_url: str,
    ai_confidence: str,
    discovered_links: list,
) -> str:
    """
    Multi-tier URL resolution with HTTP validation.

    Tier 1 — Discovered gov.in links from scraped pages (most reliable)
    Tier 2 — AI-generated URL (validated via HTTP)
    Tier 3 — DuckDuckGo search for the real gov.in page
    Tier 4 — Org homepage extracted from the AI URL domain
    Tier 5 — Google search (last resort, better than nothing)
    """
    # Reject obvious bad patterns upfront
    bad_patterns = [
        "example.com", "placeholder", "official_site", "your-official",
        "example-gov", "insert-link", "yourwebsite", "domain.com",
        "details.official", "example-link",
    ]
    if ai_url and any(p in ai_url.lower() for p in bad_patterns):
        ai_url = None

    # ── Tier 1: discovered gov.in links ─────────────────────────────────────
    gov_links = [
        l for l in (discovered_links or [])
        if l and l.startswith("http") and not _is_aggregator_url(l)
        and any(d in l.lower() for d in [".gov.in", ".nic.in", ".edu.in", ".ac.in"])
    ]
    for link in gov_links[:4]:
        print(f"    🔎 Checking discovered gov link: {link}")
        if validate_url(link):
            print(f"    ✅ Tier 1 (discovered gov link): {link}")
            return link

    # ── Tier 2: AI-generated URL ─────────────────────────────────────────────
    if ai_url and ai_url.startswith("http") and not _is_aggregator_url(ai_url):
        print(f"    🔎 Validating AI URL (confidence={ai_confidence}): {ai_url}")
        if validate_url(ai_url):
            print(f"    ✅ Tier 2 (AI URL valid): {ai_url}")
            return ai_url
        else:
            print(f"    ❌ AI URL is broken (404 or timeout): {ai_url}")

    # ── Tier 3: DuckDuckGo search ────────────────────────────────────────────
    print(f"    🔍 Falling back to DuckDuckGo search for: {title}")
    hint = extract_domain(ai_url) if ai_url else None
    found = search_official_url(title, hint_domain=hint)
    if found:
        print(f"    ✅ Tier 3 (DuckDuckGo): {found}")
        return found

    # ── Tier 4: org homepage from AI URL domain ───────────────────────────────
    if ai_url and ai_url.startswith("http"):
        parsed = urlparse(ai_url)
        homepage = f"{parsed.scheme}://{parsed.netloc}"
        if homepage != ai_url:
            print(f"    🔎 Trying org homepage: {homepage}")
            if validate_url(homepage):
                print(f"    ✅ Tier 4 (org homepage): {homepage}")
                return homepage

    # ── Tier 5: Google search (last resort) ──────────────────────────────────
    google_url = (
        f"https://www.google.com/search?q={title.replace(' ', '+')}"
        f"+official+notification+apply"
    )
    print(f"    ⚠️  Tier 5 (Google search fallback): {google_url}")
    return google_url


# ─── Normal Scrape Run ────────────────────────────────────────────────────────

async def run_automation(dry_run: bool = False, limit: int = 0):
    """
    Full scrape → consolidate → deep-research → validate URL → upsert.

    Args:
        dry_run: Skip DB writes; print final JSON to stdout.
        limit:   Max number of consolidated titles to deep-research (0 = no limit).
    """
    print("🚀 Starting Rizz Jobs Scraper (v2)...")

    db_categories = fetch_categories()
    print(f"📂 Loaded {len(db_categories)} categories from DB")

    # ── Phase 1: Discovery ───────────────────────────────────────────────────
    all_discovery = []
    for source in SOURCES:
        print(f"\n--- Checking {source['name']} ({source['url']}) ---")
        result = await fetch_page_content(source["url"])
        if result["status"] == "error":
            print(f"❌ Error fetching {source['name']}: {result.get('error')}")
            continue
        print(f"✅ Fetched {len(result['html'])} bytes from {source['name']}")
        cleaned = clean_html(result["html"])
        notifications = parse_notifications(cleaned, source["name"])
        for n in notifications:
            n["discovered_on"] = source["name"]
            all_discovery.append(n)

    if not all_discovery:
        print("⚠️  No notifications found across all sources.")
        return

    # ── Phase 2: Consolidation ───────────────────────────────────────────────
    consolidated: dict = {}
    for n in all_discovery:
        title = n.get("title", "").strip()
        if not title:
            continue

        years_in_title = re.findall(r"20\d{2}", title)
        if years_in_title and max(int(y) for y in years_in_title) < MIN_YEAR:
            print(f"  ⏭️  Skipping old entry: {title}")
            continue

        vacancy_in_title = re.search(
            r"\b([1-9])\s*(?:post|posts|vacancy|vacancies|seat|seats)\b",
            title, re.IGNORECASE
        )
        if vacancy_in_title and int(vacancy_in_title.group(1)) < MIN_VACANCIES:
            print(f"  ⏭️  Skipping low-vacancy title: {title}")
            continue

        existing_key = find_similar_title(title, consolidated)
        if existing_key is None:
            consolidated[title] = {
                "title": title,
                "discovery_links": [n.get("link")],
                "exam_date": n.get("exam_date"),
                "deadline": n.get("deadline"),
                "ai_summary": n.get("ai_summary"),
                "sources": [n["discovered_on"]],
            }
        else:
            if len(title) > len(existing_key):
                consolidated[title] = consolidated.pop(existing_key)
                consolidated[title]["title"] = title
                existing_key = title
            link = n.get("link")
            if link and link not in consolidated[existing_key]["discovery_links"]:
                consolidated[existing_key]["discovery_links"].append(link)
            if n["discovered_on"] not in consolidated[existing_key]["sources"]:
                consolidated[existing_key]["sources"].append(n["discovered_on"])
            print(f"  🔀 Merged duplicate: '{title}' → '{existing_key}'")

    titles = list(consolidated.keys())
    if limit:
        titles = titles[:limit]
        print(f"\n🔢 Processing {len(titles)} of {len(consolidated)} titles (--limit={limit})")
    else:
        print(f"\n🔍 Found {len(consolidated)} unique titles — starting deep synthesis...")

    # ── Phase 3: Deep Research & URL Resolution ───────────────────────────────
    final_list = []
    for title in titles:
        data = consolidated[title]
        print(f"\n📖 Researching: {title}")

        discovered_links = data.get("discovery_links", [])
        deep_data = parse_exam_details(
            title, data.get("ai_summary", ""), discovered_links, db_categories
        )

        if not deep_data:
            print(f"  ⚠️  No data returned for {title}, skipping")
            continue

        # Post-filter: skip very low vacancy counts
        vacancy_count = extract_max_vacancies(deep_data)
        if vacancy_count is not None and vacancy_count < MIN_VACANCIES:
            print(f"  ⏭️  Skipping low vacancy: {title} ({vacancy_count} posts)")
            continue

        # ── URL Resolution ───────────────────────────────────────────────────
        ai_url        = deep_data.get("official_link", "")
        ai_confidence = deep_data.get("official_link_confidence", "low")

        official_link = resolve_best_url(
            title, ai_url, ai_confidence, discovered_links
        )

        # ── Date Enrichment from Deep Research ───────────────────────────────
        # Deep research produces more accurate dates than the aggregator snippet.
        exam_date = data.get("exam_date")
        deadline  = data.get("deadline")
        deep_exam_date = deep_data.get("exam_date")
        deep_deadline  = deep_data.get("deadline")
        if is_real_date(deep_exam_date):
            exam_date = deep_exam_date
        if is_real_date(deep_deadline):
            deadline = deep_deadline

        # ── ai_summary: prefer the richer version from deep research ─────────
        ai_summary = deep_data.get("ai_summary") or data.get("ai_summary", "")
        if data.get("ai_summary") and len(data["ai_summary"]) > len(ai_summary):
            ai_summary = data["ai_summary"]

        # ── Build final entry ────────────────────────────────────────────────
        entry = {
            "title":         title,
            "slug":          generate_slug(title),
            "link":          official_link,
            "exam_date":     exam_date,
            "deadline":      deadline,
            "ai_summary":    ai_summary,
            "details":       deep_data.get("details", {}),
            "seo":           deep_data.get("seo", {}),
            "visuals":       deep_data.get("visuals", {}),
            "screenshot_b64": None,
            "source":        "Official Notification",
        }

        # ── Banner generation ────────────────────────────────────────────────
        banner_url = generate_banner(title, ai_summary)
        if banner_url:
            entry["visuals"]["notification_image"] = banner_url
            entry["visuals"].setdefault("metadata", {}).update({
                "alt":         f"{title} - Official Job Notification",
                "title":       title,
                "caption":     f"Official notification for {title}",
                "description": f"Job notification image for the {title} recruitment update.",
            })

        # ── PDF scanning ──────────────────────────────────────────────────────
        entry_pdf_links = []
        if official_link and "google.com/search" not in official_link and not dry_run:
            try:
                pdf_result = await fetch_page_content(official_link)
                if pdf_result["status"] == "success":
                    entry_pdf_links = extract_pdf_links(pdf_result["html"], official_link)
                    if entry_pdf_links:
                        print(f"  📄 Found {len(entry_pdf_links)} PDF(s) on official page")
            except Exception as e:
                print(f"  ⚠️  Could not scan official page for PDFs: {e}")
        entry["_pdf_links"] = entry_pdf_links

        final_list.append(entry)

    # ── Phase 4: Database Sync ────────────────────────────────────────────────
    if dry_run:
        print("\n🔵 DRY RUN — not writing to DB.")
        print(json.dumps(final_list, indent=2, default=str))
        return

    synced = upsert_notifications(final_list) or []

    for n in final_list:
        if not n.get("_pdf_links"):
            continue
        matched = next((r for r in synced if r.get("slug") == n["slug"]), None)
        if matched:
            upload_notification_documents(matched["id"], n["_pdf_links"], n["slug"])
        else:
            print(f"  ⚠️  Could not find synced ID for {n['slug']} to upload PDFs")


# ─── Refill Mode: Enrich Old Notifications ───────────────────────────────────

async def run_refill(limit: int = 30, dry_run: bool = False):
    """
    Re-research existing notifications that are missing key fields.
    Fetches from DB where exam_date IS NULL or key details fields are empty,
    then re-runs deep research and smart-merges the results.

    Does NOT overwrite fields that already have good data (smart_merge handles this).
    """
    from supabase import create_client

    print(f"🔄 Refill mode — enriching up to {limit} notifications with missing data...")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    supabase = create_client(supabase_url, supabase_key)

    db_categories = fetch_categories()

    # Fetch candidates: prioritise notifications missing exam_date or deadline
    candidates = []
    for filter_col, filter_val in [("exam_date", "null"), ("deadline", "null")]:
        try:
            res = (
                supabase.table("notifications")
                .select("id, slug, title, exam_date, deadline, details, ai_summary, link, is_active")
                .eq("is_active", True)
                .is_(filter_col, "null")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            for row in (res.data or []):
                if not any(c["slug"] == row["slug"] for c in candidates):
                    candidates.append(row)
        except Exception as e:
            print(f"  ⚠️  DB query failed ({filter_col} is null): {e}")

    # Also pick up notifications where details is sparse (no vacancies or eligibility)
    try:
        res = (
            supabase.table("notifications")
            .select("id, slug, title, exam_date, deadline, details, ai_summary, link, is_active")
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(limit * 2)
            .execute()
        )
        for row in (res.data or []):
            d = row.get("details") or {}
            if isinstance(d, str):
                try:
                    d = json.loads(d)
                except Exception:
                    d = {}
            missing = not d.get("vacancies") or not d.get("eligibility") or not d.get("important_dates")
            if missing and not any(c["slug"] == row["slug"] for c in candidates):
                candidates.append(row)
    except Exception as e:
        print(f"  ⚠️  DB query for sparse details failed: {e}")

    candidates = candidates[:limit]
    if not candidates:
        print("  ✅ No notifications need enrichment.")
        return

    print(f"  📋 Found {len(candidates)} notifications to re-research")

    enriched = []
    for row in candidates:
        title = row["title"]
        print(f"\n🔬 Enriching: {title}")

        deep_data = parse_exam_details(
            title,
            row.get("ai_summary", ""),
            [],
            db_categories,
        )
        if not deep_data:
            print(f"  ⚠️  No data returned, skipping")
            continue

        # URL resolution — only replace if current link is an aggregator or broken
        ai_url        = deep_data.get("official_link", "")
        ai_confidence = deep_data.get("official_link_confidence", "low")
        current_link  = row.get("link", "")

        if _is_aggregator_url(current_link) or "google.com/search" in current_link:
            new_link = resolve_best_url(title, ai_url, ai_confidence, [])
        else:
            # Keep the existing non-aggregator URL unless it's broken
            new_link = current_link if validate_url(current_link) else resolve_best_url(
                title, ai_url, ai_confidence, []
            )

        # Date enrichment
        exam_date = row.get("exam_date")
        deadline  = row.get("deadline")
        if is_real_date(deep_data.get("exam_date")):
            exam_date = deep_data["exam_date"]
        if is_real_date(deep_data.get("deadline")):
            deadline = deep_data["deadline"]

        ai_summary = deep_data.get("ai_summary") or row.get("ai_summary", "")
        if row.get("ai_summary") and len(row["ai_summary"]) > len(ai_summary):
            ai_summary = row["ai_summary"]

        enriched.append({
            "slug":      row["slug"],
            "title":     title,
            "link":      new_link,
            "exam_date": exam_date,
            "deadline":  deadline,
            "ai_summary": ai_summary,
            "details":   deep_data.get("details", {}),
            "seo":       deep_data.get("seo", {}),
            "_pdf_links": [],
        })

    if dry_run:
        print("\n🔵 DRY RUN — not writing to DB.")
        print(json.dumps(enriched, indent=2, default=str))
        return

    upsert_notifications(enriched)
    print(f"\n✅ Refill complete — {len(enriched)} notifications enriched.")


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Rizz Jobs — Government Exam Scraper v2")
    ap.add_argument(
        "--dry-run", action="store_true",
        help="Run without writing to the database (prints JSON to stdout)",
    )
    ap.add_argument(
        "--refill", action="store_true",
        help="Re-research existing notifications with missing fields (does not scrape sources)",
    )
    ap.add_argument(
        "--limit", type=int, default=0,
        help="Max number of titles to deep-research per run (0 = no limit)",
    )
    ap.add_argument(
        "--refill-limit", type=int, default=30,
        help="Max number of notifications to enrich in --refill mode (default 30)",
    )
    args = ap.parse_args()

    if args.refill:
        asyncio.run(run_refill(limit=args.refill_limit, dry_run=args.dry_run))
    else:
        asyncio.run(run_automation(dry_run=args.dry_run, limit=args.limit))

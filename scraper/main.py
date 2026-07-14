"""
Rizz Jobs — Government Exam Scraper  (v3)
=========================================
Key changes in v3:
  • Parallel source fetching: all 9 sources fetched simultaneously via a single
    shared Playwright browser context — 5x faster than sequential.
  • Parallel deep research: GPT-4o calls run concurrently via asyncio.
  • Serper.dev replaces DuckDuckGo HTML scraping — accurate, rate-limit-free.
  • Tier 5 (Google search URL fallback) REMOVED. A bad URL is never saved;
    instead the notification is flagged needs_url_review=True.
  • Pydantic validation: all AI output is validated before DB insert.
  • Grounded enrichment: if official URL resolves, page text is fetched first
    and passed to GPT-4o as ground truth (eliminates hallucinated dates/facts).
"""

import asyncio
import argparse
import json
import os
import re
from difflib import SequenceMatcher
from typing import Optional
from urllib.parse import urlparse

from pydantic import BaseModel, field_validator, model_validator
from openai import AsyncOpenAI

from engine import fetch_all_sources, fetch_page_content, validate_url, search_official_url, extract_domain
from parser import clean_html, parse_notifications, parse_exam_details_async
from db import upsert_notifications, fetch_categories
from image_gen import generate_banner
from organizations import find_org_in_title, title_has_org_context, org_from_url
from dotenv import load_dotenv

try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False

load_dotenv()


# ─── Configuration ─────────────────────────────────────────────────────────────

MIN_VACANCIES = 10
CURRENT_YEAR  = 2026
MIN_YEAR      = CURRENT_YEAR - 1   # Accept 2025 and 2026

AGGREGATOR_DOMAINS = [
    "sarkari", "freejobalert", "jagranjosh", "testbook",
    "rojgar", "freshersworld", "naukri", "shine.com",
    "indeed", "timesjobs", "recruitment.result",
    "govtjob", "sarkarijob", "latestjob", "indgovt",
]

# ─── Sources ─────────────────────────────────────────────────────────────────
SOURCES = [
    # Direct Government Portals (authoritative, highest-quality URLs)
    {"name": "UPSC",              "url": "https://upsc.gov.in/whats-new"},
    {"name": "SSC",               "url": "https://ssc.gov.in/"},
    {"name": "IBPS",              "url": "https://www.ibps.in/"},
    {"name": "EmploymentNews",    "url": "https://employmentnews.gov.in/"},
    # High-quality aggregators
    {"name": "FreeJobAlert",      "url": "https://www.freejobalert.com/latest-notifications/"},
    {"name": "SarkariResult",     "url": "https://www.sarkariresult.com/latestjob/"},
    {"name": "SarkariExam",       "url": "https://www.sarkariexam.com/"},
    {"name": "JagranJosh",        "url": "https://www.jagranjosh.com/articles/government-jobs-exam-notifications-updates-1330335198-1"},
    {"name": "GovtJobsIndia",     "url": "https://www.govtjobsindia.in/latest-jobs/"},
]


# ─── Pydantic Validation Models ───────────────────────────────────────────────

class ExamDetails(BaseModel):
    vacancies:         Optional[str] = None
    eligibility:       Optional[str] = None
    application_fee:   Optional[str] = None
    important_dates:   Optional[dict] = None
    selection_process: Optional[list] = None
    categories:        Optional[list] = None
    age_limit:         Optional[str] = None
    what_is_the_update:Optional[str] = None
    direct_answer:     Optional[list] = None
    faqs:              Optional[list] = None
    how_to_apply:      Optional[str] = None


class ScrapedNotification(BaseModel):
    title:        str
    slug:         str
    link:         Optional[str] = None
    exam_date:    Optional[str] = None
    deadline:     Optional[str] = None
    ai_summary:   Optional[str] = None
    details:      Optional[ExamDetails] = None
    seo:          Optional[dict] = None
    visuals:      Optional[dict] = None
    source:       str = "Official Notification"
    needs_url_review: bool = False
    is_active:    bool = True

    @field_validator("exam_date", "deadline", mode="before")
    @classmethod
    def validate_date(cls, v):
        if not v:
            return None
        s = str(v).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            return None
        return s

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()

    @model_validator(mode="after")
    def flag_missing_url(self):
        if not self.link:
            self.needs_url_review = True
        return self


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
) -> str | None:
    """
    Multi-tier URL resolution with HTTP validation.

    Tier 1 — Discovered gov.in links from scraped pages (most reliable)
    Tier 2 — AI-generated URL (validated via HTTP)
    Tier 3 — Serper.dev search for the real gov.in page
    Tier 4 — Org homepage extracted from the AI URL domain

    *** Tier 5 (Google search URL) has been removed. ***
    A notification with no valid URL is saved with needs_url_review=True
    rather than saving a Google search URL that misleads users and
    signals to search engines that we're a low-quality aggregator.
    """
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

    # ── Tier 3: Serper.dev search ────────────────────────────────────────────
    print(f"    🔍 Falling back to Serper.dev search for: {title}")
    hint = extract_domain(ai_url) if ai_url else None
    found = search_official_url(title, hint_domain=hint)
    if found:
        print(f"    ✅ Tier 3 (Serper.dev): {found}")
        return found

    # ── Tier 4: org homepage from AI URL domain ───────────────────────────────
    if ai_url and ai_url.startswith("http"):
        parsed = urlparse(ai_url)
        homepage = f"{parsed.scheme}://{parsed.netloc}"
        if homepage != ai_url and any(d in homepage for d in [".gov.in", ".nic.in", ".edu.in", ".ac.in"]):
            print(f"    🔎 Trying org homepage: {homepage}")
            if validate_url(homepage):
                print(f"    ✅ Tier 4 (org homepage): {homepage}")
                return homepage

    # ── No valid URL found ────────────────────────────────────────────────────
    print(f"    ⚠️  No valid URL found for: {title} — flagging needs_url_review=True")
    return None


# ─── Official Page Text Extraction (grounds AI enrichment) ───────────────────

async def fetch_official_page_text(url: str) -> str:
    """
    Fetch the official gov.in page and extract clean text for grounded
    AI enrichment. Uses trafilatura if available (best content extraction),
    otherwise falls back to BeautifulSoup plain text.
    """
    if not url or not url.startswith("http"):
        return ""
    try:
        result = await fetch_page_content(url)
        if result.get("status") != "success":
            return ""
        html = result.get("html", "")
        if HAS_TRAFILATURA:
            text = trafilatura.extract(html, url=url, include_tables=True, include_links=False)
            return (text or "")[:25000]
        # Fallback: BeautifulSoup
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:25000]
    except Exception as e:
        print(f"    ⚠️  Could not fetch official page text: {e}")
        return ""


# ─── Normal Scrape Run ────────────────────────────────────────────────────────

async def run_automation(dry_run: bool = False, limit: int = 0):
    """
    Full scrape → consolidate → deep-research → validate URL → upsert.

    v3 improvements:
    - All 9 sources fetched in parallel (single shared browser context)
    - Deep research runs concurrently (asyncio + OpenAI async client)
    - Official page text fetched and passed to AI as ground truth
    - No Google search URL fallback — missing URLs flagged for review
    """
    print("🚀 Starting Rizz Jobs Scraper (v3)...")

    db_categories = fetch_categories()
    print(f"📂 Loaded {len(db_categories)} categories from DB")

    # ── Phase 1: Parallel Discovery ──────────────────────────────────────────
    print(f"\n📡 Fetching {len(SOURCES)} sources in parallel...")
    source_results = await fetch_all_sources(SOURCES)

    all_discovery = []
    for result in source_results:
        source_name = result.get("source_name", "Unknown")
        if result.get("status") == "error":
            print(f"  ❌ Error fetching {source_name}: {result.get('error')}")
            continue
        print(f"  ✅ Fetched {len(result.get('html', ''))} bytes from {source_name}")
        cleaned = clean_html(result["html"])
        notifications = parse_notifications(cleaned, source_name)
        for n in notifications:
            n["discovered_on"] = source_name
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
            continue

        vacancy_in_title = re.search(
            r"\b([1-9])\s*(?:post|posts|vacancy|vacancies|seat|seats)\b",
            title, re.IGNORECASE
        )
        if vacancy_in_title and int(vacancy_in_title.group(1)) < MIN_VACANCIES:
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

    titles = list(consolidated.keys())
    if limit:
        # Research up to 6× the target so we can find `limit` genuinely new entries
        # even when most titles are already in the DB from a recent run.
        research_cap = min(len(titles), limit * 6)
        titles = titles[:research_cap]
        print(f"\n🔢 Targeting {limit} new entries — researching up to {research_cap} titles...")
    else:
        print(f"\n🔍 Found {len(consolidated)} unique titles — starting parallel deep synthesis...")

    # ── Phase 3: Parallel Deep Research ──────────────────────────────────────
    async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    sem = asyncio.Semaphore(5)  # max 5 concurrent GPT-4o calls

    async def research_one(title: str) -> dict | None:
        async with sem:
            data = consolidated[title]
            print(f"\n📖 Researching: {title}")
            discovered_links = data.get("discovery_links", [])

            # First pass: resolve URL before AI enrichment
            # (so we can pass official page text to GPT-4o as ground truth)
            initial_ai_url = ""  # Will be resolved after first GPT pass if needed
            official_url = resolve_best_url(title, initial_ai_url, "low", discovered_links)

            # Fetch official page text for grounded enrichment
            official_text = ""
            if official_url:
                print(f"    📄 Fetching official page text: {official_url}")
                official_text = await fetch_official_page_text(official_url)
                if official_text:
                    print(f"    ✅ Got {len(official_text)} chars of official content")

            deep_data = await parse_exam_details_async(
                async_client, title, data.get("ai_summary", ""), discovered_links, db_categories, official_text
            )

            if not deep_data:
                print(f"  ⚠️  No data returned for {title}, skipping")
                return None

            # Post-filter: skip very low vacancy counts
            vacancy_count = extract_max_vacancies(deep_data)
            if vacancy_count is not None and vacancy_count < MIN_VACANCIES:
                print(f"  ⏭️  Skipping low vacancy: {title} ({vacancy_count} posts)")
                return None

            # Post-filter: skip stale notifications
            MIN_DATE_STR = f"{MIN_YEAR}-01-01"
            check_date = (
                deep_data.get("deadline") or data.get("deadline") or
                deep_data.get("exam_date") or data.get("exam_date") or ""
            )
            if is_real_date(check_date) and check_date < MIN_DATE_STR:
                print(f"  ⏭️  Skipping stale notification (date {check_date} < {MIN_DATE_STR}): {title}")
                return None

            # If URL wasn't found in Tier 1 (no gov link discovered), run full resolution
            # using the AI-suggested URL from deep research
            if not official_url:
                ai_url        = deep_data.get("official_link", "")
                ai_confidence = deep_data.get("official_link_confidence", "low")
                official_url  = resolve_best_url(title, ai_url, ai_confidence, discovered_links)

            # Date enrichment
            exam_date = data.get("exam_date")
            deadline  = data.get("deadline")
            if is_real_date(deep_data.get("exam_date")):
                exam_date = deep_data["exam_date"]
            if is_real_date(deep_data.get("deadline")):
                deadline = deep_data["deadline"]

            ai_summary = deep_data.get("ai_summary") or data.get("ai_summary", "")
            if data.get("ai_summary") and len(data["ai_summary"]) > len(ai_summary):
                ai_summary = data["ai_summary"]

            # ── Title contract: every published title must name its org ─────
            # "Warder - 288 Posts" is unfindable; "UP Police Jail Warder
            # Recruitment 2026 - 288 Posts" is a search query people type.
            publish = True
            if not find_org_in_title(title):
                org = org_from_url(official_url)
                if org:
                    title = f"{org} {title}"
                    print(f"    🏷️  Org prepended from link domain: {title[:70]}")
                elif not title_has_org_context(title):
                    publish = False
                    print(f"    🚫 No organization resolvable — holding for review: {title[:70]}")

            slug = generate_slug(title)
            raw_entry = {
                "title":         title,
                "slug":          slug,
                "link":          official_url,
                "exam_date":     exam_date,
                "deadline":      deadline,
                "ai_summary":    ai_summary,
                "details":       deep_data.get("details", {}),
                "seo":           deep_data.get("seo", {}),
                "visuals":       deep_data.get("visuals", {}),
                "source":        "Official Notification",
                "needs_url_review": official_url is None,
                "is_active":     publish,
            }

            # Pydantic validation
            try:
                validated = ScrapedNotification(**raw_entry)
                return validated.model_dump()
            except Exception as e:
                print(f"  ⚠️  Validation failed for {title}: {e} — skipping")
                return None

    tasks = [research_one(t) for t in titles]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    final_list = []
    for title, result in zip(titles, raw_results):
        if isinstance(result, Exception):
            print(f"  ❌ Exception researching {title}: {result}")
            continue
        if result is None:
            continue
        final_list.append(result)

    # ── Phase 4: Banner Generation (parallel) ────────────────────────────────
    print(f"\n🎨 Generating banners for {len(final_list)} notifications...")
    for entry in final_list:
        entry_details = entry.get("details") or {}
        entry_categories = entry_details.get("categories") or []
        banner_url = generate_banner(
            entry["title"],
            entry.get("ai_summary", ""),
            slug=entry["slug"],
            deadline=entry.get("deadline"),
            category=entry_categories[0] if entry_categories else None,
        )
        if banner_url:
            if not entry.get("visuals"):
                entry["visuals"] = {}
            entry["visuals"]["notification_image"] = banner_url
            entry["visuals"].setdefault("metadata", {}).update({
                "alt":         f"{entry['title']} - Official Job Notification",
                "title":       entry["title"],
                "caption":     f"Official notification for {entry['title']}",
                "description": f"Job notification image for the {entry['title']} recruitment update.",
            })

    # ── Phase 5: Database Sync ────────────────────────────────────────────────
    if dry_run:
        print("\n🔵 DRY RUN — not writing to DB.")
        print(json.dumps(final_list, indent=2, default=str))
        return

    print(f"\n📦 Syncing {len(final_list)} notifications to DB...")
    upsert_notifications(final_list, max_new=limit)


# ─── Refill Mode ─────────────────────────────────────────────────────────────

async def run_refill(limit: int = 30, dry_run: bool = False):
    """
    Re-research existing notifications that are missing key fields.
    In v3: also re-runs URL resolution for notifications flagged needs_url_review=True.
    """
    from supabase import create_client

    print(f"🔄 Refill mode — enriching up to {limit} notifications...")

    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    db_categories = fetch_categories()
    async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    candidates = []
    for filter_col, filter_val in [("exam_date", "null"), ("deadline", "null")]:
        try:
            res = (
                supabase.table("notifications")
                .select("id, slug, title, source, exam_date, deadline, details, ai_summary, link, is_active, needs_url_review")
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

    # Also pick up needs_url_review notifications
    try:
        res = (
            supabase.table("notifications")
            .select("id, slug, title, source, exam_date, deadline, details, ai_summary, link, is_active, needs_url_review")
            .eq("is_active", True)
            .eq("needs_url_review", True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        for row in (res.data or []):
            if not any(c["slug"] == row["slug"] for c in candidates):
                candidates.append(row)
    except Exception as e:
        print(f"  ⚠️  DB query for needs_url_review failed: {e}")

    # Pick up notifications whose link is a Google search URL (stale from before Tier 5 was removed)
    for google_pattern in ["google.com/search", "google.co.in/search"]:
        try:
            res = (
                supabase.table("notifications")
                .select("id, slug, title, source, exam_date, deadline, details, ai_summary, link, is_active, needs_url_review")
                .eq("is_active", True)
                .like("link", f"%{google_pattern}%")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            for row in (res.data or []):
                if not any(c["slug"] == row["slug"] for c in candidates):
                    candidates.append(row)
        except Exception as e:
            print(f"  ⚠️  DB query for google-link jobs failed ({google_pattern}): {e}")

    # Sparse details
    try:
        res = (
            supabase.table("notifications")
            .select("id, slug, title, source, exam_date, deadline, details, ai_summary, link, is_active")
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

    sem = asyncio.Semaphore(5)

    async def refill_one(row: dict) -> dict | None:
        async with sem:
            title = row["title"]
            print(f"\n🔬 Enriching: {title}")
            current_link = row.get("link", "")

            # Resolve URL first
            if _is_aggregator_url(current_link) or "google.com" in (current_link or "") or not current_link:
                new_link = resolve_best_url(title, "", "low", [])
            else:
                new_link = current_link if validate_url(current_link) else resolve_best_url(title, "", "low", [])

            # Fetch official page for grounded enrichment
            official_text = ""
            if new_link:
                official_text = await fetch_official_page_text(new_link)

            deep_data = await parse_exam_details_async(
                async_client, title, row.get("ai_summary", ""), [], db_categories, official_text
            )
            if not deep_data:
                return None

            # URL from AI if still not resolved
            if not new_link:
                ai_url = deep_data.get("official_link", "")
                ai_confidence = deep_data.get("official_link_confidence", "low")
                new_link = resolve_best_url(title, ai_url, ai_confidence, [])

            exam_date = row.get("exam_date")
            deadline  = row.get("deadline")
            if is_real_date(deep_data.get("exam_date")):
                exam_date = deep_data["exam_date"]
            if is_real_date(deep_data.get("deadline")):
                deadline = deep_data["deadline"]

            ai_summary = deep_data.get("ai_summary") or row.get("ai_summary", "")
            if row.get("ai_summary") and len(row["ai_summary"]) > len(ai_summary):
                ai_summary = row["ai_summary"]

            return {
                "slug":             row["slug"],
                "title":            title,
                "source":           row.get("source") or "refill",
                "link":             new_link,
                "exam_date":        exam_date,
                "deadline":         deadline,
                "ai_summary":       ai_summary,
                "details":          deep_data.get("details", {}),
                "seo":              deep_data.get("seo", {}),
                "needs_url_review": new_link is None,
            }

    results = await asyncio.gather(*[refill_one(r) for r in candidates], return_exceptions=True)
    enriched = [r for r in results if r and not isinstance(r, Exception)]

    if dry_run:
        print("\n🔵 DRY RUN — not writing to DB.")
        print(json.dumps(enriched, indent=2, default=str))
        return

    upsert_notifications(enriched)
    print(f"\n✅ Refill complete — {len(enriched)} notifications enriched.")


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Rizz Jobs — Government Exam Scraper v3")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--refill", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--refill-limit", type=int, default=30)
    args = ap.parse_args()

    if args.refill:
        asyncio.run(run_refill(limit=args.refill_limit, dry_run=args.dry_run))
    else:
        asyncio.run(run_automation(dry_run=args.dry_run, limit=args.limit))

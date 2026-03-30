"""
Rizz Jobs — Finance & Business News Scraper
Fetches RSS feeds from credible Indian financial sources, deduplicates,
rewrites each article with GPT-4o in a unique editorial voice, generates
SEO metadata + NewsArticle schema, and upserts to the news_articles table.

Run: python news_scraper.py [--limit 15]
"""
import os
import re
import json
import hashlib
import argparse
import feedparser
from datetime import datetime, timezone
from difflib import SequenceMatcher
from openai import OpenAI
from supabase import create_client, Client

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY")  # optional

NEWS_CATEGORIES = ["finance", "business", "economy", "markets", "startups"]
SIMILARITY_THRESHOLD = 0.85


# ── Slug helpers ──────────────────────────────────────────────────────────────
def generate_slug(headline: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", headline.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug[:80]


def ensure_unique_slug(base_slug: str, existing_slugs: set) -> str:
    if base_slug not in existing_slugs:
        return base_slug
    suffix = hashlib.md5(base_slug.encode()).hexdigest()[:6]
    return f"{base_slug[:73]}-{suffix}"


# ── Deduplication ─────────────────────────────────────────────────────────────
def titles_are_similar(a: str, b: str) -> bool:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= SIMILARITY_THRESHOLD


# ── Data Fetching ─────────────────────────────────────────────────────────────
def fetch_news_sources(supabase: Client) -> list[dict]:
    result = supabase.table("news_sources").select("*").eq("is_active", True).execute()
    return result.data or []


def fetch_rss_feed(source: dict) -> list[dict]:
    """Parse a single RSS feed and return normalised raw article dicts."""
    try:
        feed = feedparser.parse(source["rss_url"])
        articles = []
        for entry in feed.entries[:20]:  # cap per source to avoid runaway cost
            # Resolve publish time
            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published_at = datetime(
                    *entry.published_parsed[:6], tzinfo=timezone.utc
                ).isoformat()
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                published_at = datetime(
                    *entry.updated_parsed[:6], tzinfo=timezone.utc
                ).isoformat()
            else:
                published_at = datetime.now(timezone.utc).isoformat()

            # Try to extract image from media_content or enclosures
            image_url = None
            if hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
            elif hasattr(entry, "enclosures") and entry.enclosures:
                image_url = entry.enclosures[0].get("href")

            headline = entry.get("title", "").strip()
            if not headline:
                continue

            articles.append({
                "headline": headline,
                "original_url": entry.get("link", ""),
                "raw_summary": entry.get("summary", ""),
                "published_at": published_at,
                "source_name": source["name"],
                "source_url": source["rss_url"],
                "source_category": source["category"],
                "image_url": image_url,
            })
        return articles
    except Exception as e:
        print(f"  ⚠  RSS fetch failed for {source['name']}: {e}")
        return []


def fetch_newsapi(api_key: str) -> list[dict]:
    """Optional: fetch top business headlines from NewsAPI.org."""
    try:
        import requests
        resp = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={"country": "in", "category": "business", "pageSize": 20, "apiKey": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        articles = []
        for a in data.get("articles", []):
            if not a.get("title") or a["title"] == "[Removed]":
                continue
            published_at = a.get("publishedAt") or datetime.now(timezone.utc).isoformat()
            articles.append({
                "headline": a["title"].strip(),
                "original_url": a.get("url", ""),
                "raw_summary": a.get("description", ""),
                "published_at": published_at,
                "source_name": a.get("source", {}).get("name", "NewsAPI"),
                "source_url": "https://newsapi.org",
                "source_category": "business",
                "image_url": a.get("urlToImage"),
            })
        return articles
    except Exception as e:
        print(f"  ⚠  NewsAPI fetch failed: {e}")
        return []


def fetch_existing_data(supabase: Client) -> tuple[set, set]:
    """Return (existing_slugs, existing_headlines) for deduplication."""
    result = supabase.table("news_articles").select("slug, headline").execute()
    slugs = {row["slug"] for row in (result.data or [])}
    headlines = {row["headline"] for row in (result.data or [])}
    return slugs, headlines


# ── AI Enrichment ─────────────────────────────────────────────────────────────
ENRICH_PROMPT = """You are an authoritative Indian financial journalist for Rizz Jobs.
Given a raw news item, produce a JSON response with the following fields.

RAW ARTICLE:
Headline: {headline}
Source: {source_name}
Snippet/Summary: {raw_summary}
Original URL: {original_url}
Suggested category: {source_category}

INSTRUCTIONS:
1. REWRITE the article in a unique, authoritative journalistic voice (300-500 words).
   Do NOT reproduce source text verbatim. Add context, market implications,
   and analysis relevant to Indian investors and business readers.
2. Generate a 2-3 sentence summary for article preview cards.
3. Categorize into exactly one of: finance, business, economy, markets, startups
4. Generate SEO metadata:
   - meta_title: ≤60 characters, keyword-rich
   - meta_description: ≤160 characters, action-oriented
   - meta_keywords: 6-10 comma-separated keywords
5. Generate 5-8 short tag phrases (e.g. "RBI rate cut", "Nifty 50", "SBI quarterly results")
6. Generate descriptive image alt text (no 'AI-generated' language)
7. Keep the headline clean: 60-80 characters, keyword-rich, no clickbait

Respond with ONLY valid JSON (no markdown fences):
{{
  "headline": "improved headline (60-80 chars)",
  "content": "rewritten article (300-500 words)",
  "summary": "2-3 sentence preview",
  "category": "finance|business|economy|markets|startups",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "image_alt": "descriptive alt text",
  "seo": {{
    "meta_title": "≤60 chars",
    "meta_description": "≤160 chars",
    "meta_keywords": "kw1, kw2, kw3"
  }}
}}"""


def enrich_article_with_gpt4o(raw: dict, client: OpenAI) -> dict | None:
    """Rewrite + categorize + generate SEO metadata via GPT-4o."""
    prompt = ENRICH_PROMPT.format(
        headline=raw["headline"],
        source_name=raw["source_name"],
        raw_summary=(raw.get("raw_summary") or "")[:800],
        original_url=raw.get("original_url", ""),
        source_category=raw.get("source_category", "finance"),
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        enriched = json.loads(response.choices[0].message.content)

        slug_base = generate_slug(enriched.get("headline") or raw["headline"])
        return {
            "headline": enriched.get("headline", raw["headline"]),
            "content": enriched.get("content", ""),
            "summary": enriched.get("summary", ""),
            "category": enriched.get("category", "finance"),
            "tags": enriched.get("tags", []),
            "image_alt": enriched.get("image_alt", ""),
            "seo": enriched.get("seo", {}),
            "slug_base": slug_base,
            "published_at": raw["published_at"],
            "source_name": raw["source_name"],
            "source_url": raw["source_url"],
            "original_url": raw.get("original_url", ""),
            "image_url": raw.get("image_url"),
        }
    except Exception as e:
        print(f"  ✗  GPT-4o enrichment failed for '{raw['headline'][:50]}': {e}")
        return None


# ── Database Upsert ───────────────────────────────────────────────────────────
def upsert_articles(articles: list[dict], supabase: Client) -> int:
    """Upsert enriched articles to news_articles table. Returns count inserted."""
    inserted = 0
    for a in articles:
        row = {
            "slug": a["slug"],
            "headline": a["headline"],
            "content": a["content"],
            "summary": a["summary"],
            "category": a.get("category", "finance"),
            "source_name": a["source_name"],
            "source_url": a["source_url"],
            "original_url": a["original_url"],
            "published_at": a["published_at"],
            "image_url": a.get("image_url"),
            "image_alt": a.get("image_alt") or "",
            "tags": a.get("tags", []),
            "seo": a.get("seo", {}),
            "is_published": True,
        }
        try:
            supabase.table("news_articles").upsert(
                row, on_conflict="slug", returning="minimal"
            ).execute()
            inserted += 1
        except Exception as e:
            print(f"  ✗  Upsert failed for '{a['headline'][:50]}': {e}")
    return inserted


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Rizz Jobs News Scraper")
    parser.add_argument("--limit", type=int, default=15,
                        help="Max articles to enrich per run (default: 15)")
    args = parser.parse_args()

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

    print(f"🗞  Rizz Jobs News Scraper — limit={args.limit}")

    # 1. Load active RSS sources from DB
    sources = fetch_news_sources(supabase)
    print(f"   {len(sources)} active RSS sources loaded from DB")

    # 2. Load existing data for deduplication
    existing_slugs, existing_headlines = fetch_existing_data(supabase)
    print(f"   {len(existing_slugs)} existing articles in DB")

    # 3. Gather raw articles from all RSS feeds
    all_raw: list[dict] = []
    for source in sources:
        items = fetch_rss_feed(source)
        print(f"   {source['name']}: {len(items)} items")
        all_raw.extend(items)

    # 4. Optionally fetch from NewsAPI
    if NEWSAPI_KEY:
        newsapi_items = fetch_newsapi(NEWSAPI_KEY)
        print(f"   NewsAPI: {len(newsapi_items)} items")
        all_raw.extend(newsapi_items)

    # 5. Deduplicate candidates
    candidates: list[dict] = []
    seen_titles: list[str] = []

    for raw in all_raw:
        headline = raw["headline"]
        if not headline:
            continue
        # Skip if too similar to an existing DB headline
        if any(titles_are_similar(headline, h) for h in existing_headlines):
            continue
        # Skip if too similar to another candidate in this run
        if any(titles_are_similar(headline, h) for h in seen_titles):
            continue
        seen_titles.append(headline)
        candidates.append(raw)

    print(f"\n   {len(candidates)} unique new candidates after deduplication")
    candidates = candidates[:args.limit]
    print(f"   Enriching {len(candidates)} articles with GPT-4o...\n")

    # 6. Enrich each candidate
    enriched_articles: list[dict] = []
    for i, raw in enumerate(candidates, 1):
        print(f"   [{i}/{len(candidates)}] {raw['headline'][:65]}")
        enriched = enrich_article_with_gpt4o(raw, openai_client)
        if enriched:
            slug = ensure_unique_slug(enriched["slug_base"], existing_slugs)
            enriched["slug"] = slug
            existing_slugs.add(slug)
            existing_headlines.add(enriched["headline"])
            enriched_articles.append(enriched)

    # 7. Upsert to Supabase
    if enriched_articles:
        count = upsert_articles(enriched_articles, supabase)
        print(f"\n✅  Done: {count}/{len(enriched_articles)} articles upserted to news_articles")
    else:
        print("\n✅  Done: no new articles to insert")


if __name__ == "__main__":
    main()

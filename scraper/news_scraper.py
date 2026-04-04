"""
Rizz Jobs — Finance & Business News Scraper
Fetches RSS feeds from credible Indian financial sources, deduplicates,
rewrites each article with GPT-4o in a unique editorial voice, generates
SEO metadata + NewsArticle schema, generates AI news banners via Gemini
(using source image as visual reference), and upserts to news_articles.

Run: python news_scraper.py [--limit 15] [--no-banners]
"""
import io
import os
import re
import json
import hashlib
import argparse
import requests
import feedparser
from PIL import Image
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from google import genai
from google.genai import types
from openai import OpenAI
from supabase import create_client, Client

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")  # required for banner generation
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY")        # optional

NEWS_CATEGORIES = ["finance", "business", "economy", "markets", "startups", "ipl"]
SIMILARITY_THRESHOLD = 0.85
BANNER_BUCKET = "job-banners"
IST = timezone(timedelta(hours=5, minutes=30))

# Category → color palette description for the banner prompt
CATEGORY_PALETTE = {
    "finance":  "deep navy blue (#0f172a) to royal blue (#1d4ed8), with gold accent highlights",
    "business": "charcoal (#1c1917) to deep purple (#4c1d95), with silver accent highlights",
    "markets":  "dark forest green (#052e16) to emerald (#065f46), with bright green accent highlights",
    "economy":  "deep slate (#0f172a) to dark teal (#134e4a), with amber accent highlights",
    "startups": "near-black (#0c0a09) to deep rose (#881337), with coral accent highlights",
    "ipl":      "deep night blue (#0a0f1e) to vivid cyan-teal (#0e7490), with golden accent highlights",
}


# ── News Banner Generation ────────────────────────────────────────────────────
def _download_source_image(url: str) -> tuple[bytes, str] | None:
    """Download source image bytes + mime type. Returns None on failure."""
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not ct.startswith("image/"):
            return None
        return resp.content, ct
    except Exception:
        return None


def generate_news_banner(
    headline: str,
    summary: str,
    category: str,
    slug: str,
    source_image_url: str | None,
    supabase: Client,
) -> str | None:
    """
    Generate a professional news banner image using Gemini 2.5 Flash Image.

    If source_image_url is provided, it is passed as a visual reference so
    Gemini understands the article's subject matter and generates a contextually
    relevant banner. The prompt follows news-design best practices:
      - Editorial/photojournalistic quality
      - Category-specific color palette with gradient overlay
      - Cinematic lighting, strong depth of field
      - Prominent safe zone on the left/bottom for headline text overlay (CSS)
      - No stock-photo clichés; no watermarks; no generated-image disclaimers
    """
    if not GEMINI_API_KEY:
        print("  ⚠  GEMINI_API_KEY not set — skipping banner generation")
        return None

    palette = CATEGORY_PALETTE.get(category, CATEGORY_PALETTE["finance"])

    prompt = f"""You are a senior news banner designer for "Rizz Jobs", a premium Indian financial news publication.
Create a high-impact, editorial-quality news banner with the headline text PROMINENTLY rendered inside the image.

ARTICLE:
Category: {category.upper()}
Headline: {headline}
Summary: {summary}

DESIGN REQUIREMENTS — follow every rule strictly:

BACKGROUND & STYLE:
1. Aspect ratio: 16:9 landscape (1280×720px). Never square, never portrait.
2. Color palette: dark gradient from {palette}.
3. Style: photojournalistic + editorial. Think Bloomberg, Financial Times, The Economist visual language.
4. Lighting: cinematic — directional, moody, high-contrast.
5. Subject matter: use the REFERENCE IMAGE as context. Reimagine it as a polished editorial composition.
6. Visual language for {category}:
   - finance: bank facades, currency symbols, financial district skylines, RBI building silhouette
   - business: corporate boardrooms, handshakes, India Gate/Bombay Stock Exchange exteriors
   - markets: stock ticker screens, trading floors, candlestick chart overlays, NSE signage
   - economy: infrastructure, highways, factories, agricultural fields, budget documents
   - startups: modern co-working spaces, smartphones, tech devices, young entrepreneurs
   - ipl: cricket stadiums packed with fans, bat-ball action shots, IPL trophy, team jersey colors, Wankhede/Eden Gardens/Chepauk atmosphere

TEXT LAYOUT (CRITICAL — render all text directly in the image):
7. DARK GRADIENT OVERLAY: Apply a smooth dark gradient over the bottom 50% of the image
   (fully opaque black at the bottom edge, fading to transparent at mid-image).
   This ensures headline text is always legible regardless of background imagery.
8. HEADLINE: Render the FULL headline text in the lower-left area of the image.
   - Font: bold, modern sans-serif (Inter, Helvetica Neue, or similar clean editorial font)
   - Size: large and impactful — must be the dominant text element
   - Color: crisp white (#FFFFFF) with a subtle drop shadow
   - Padding: ~5% from left edge, ~8% from bottom edge
   - Max width: 85% of image width — wrap to 2-3 lines if needed, never truncate
9. CATEGORY BADGE: Top-left corner — small rounded pill badge with "{category.upper()}" in bold uppercase.
   Use a semi-transparent colored background matching the category palette accent color.
   White text inside the badge. 8% from top and left edges.
10. BRANDING: Bottom-right corner — "Rizz Jobs" in small white text, 60% opacity. Subtle, not distracting.

QUALITY:
11. Ultra-sharp, professional. No blur, no noise, no watermarks.
    No "AI-generated", "created by", or any meta-commentary text anywhere.
12. Avoid: cheesy stock photo clichés, generic office workers, clipart, cartoons.
"""

    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)

        # Build content parts — text prompt always included
        content_parts: list = [prompt]

        # Attach source image as visual reference if available
        if source_image_url:
            img_data = _download_source_image(source_image_url)
            if img_data:
                img_bytes, mime_type = img_data
                content_parts.insert(
                    0,
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                )
                print(f"  🖼  Source image attached as reference ({len(img_bytes)//1024}KB)")

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=content_parts,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        for part in response.parts:
            if part.inline_data is not None:
                raw = part.inline_data.data
                if isinstance(raw, str):
                    import base64
                    raw = base64.b64decode(raw)

                # Convert to WebP quality 82 — sharp + compact
                img = Image.open(io.BytesIO(raw))
                buf = io.BytesIO()
                img.save(buf, format="WEBP", quality=82)
                webp_bytes = buf.getvalue()

                # SEO-friendly path: news-banners/{slug}-finance-news-banner.webp
                safe_slug = re.sub(r"[^a-z0-9-]", "-", slug.lower())[:80]
                file_path = f"news-banners/{safe_slug}-{category}-news-banner.webp"

                supabase.storage.from_(BANNER_BUCKET).upload(
                    path=file_path,
                    file=webp_bytes,
                    file_options={"content-type": "image/webp", "upsert": "true"},
                )

                public_url = supabase.storage.from_(BANNER_BUCKET).get_public_url(file_path)
                print(f"  ✅ Banner uploaded: {public_url}")
                return public_url

        print(f"  ⚠  Gemini returned no image for: {headline[:60]}")
        return None

    except Exception as e:
        print(f"  ❌ Banner generation failed for '{headline[:60]}': {e}")
        return None


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

CATEGORY DEFINITIONS (pick the single best fit — do NOT default to "markets"):
- finance:  personal finance, banking, insurance, mutual funds, loans, RBI policy, credit, FD/savings
- business: corporate earnings, company results, M&A, industry news, CEO/leadership, supply chain
- economy:  GDP, inflation, government budget, fiscal policy, trade balance, manufacturing, employment
- markets:  ONLY use for Nifty/Sensex levels, stock price movements, IPO listings, F&O, commodity/currency trading
- startups: funding rounds, unicorn valuations, new product launches, Indian tech startups, VC/PE deals
- ipl:      Indian Premier League cricket — match results, player performance, team standings, auction news, IPL 2026

INSTRUCTIONS:
1. REWRITE the article in a unique, authoritative journalistic voice (300-500 words).
   Do NOT reproduce source text verbatim. Add context, market implications,
   and analysis relevant to Indian investors and business readers.
2. Generate a 2-3 sentence summary for article preview cards.
3. Assign a category using the definitions above. Only use "markets" if the article
   is specifically about stock/index price movements or trading activity.
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
  "category": "finance|business|economy|markets|startups|ipl",
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
    parser.add_argument("--no-banners", action="store_true",
                        help="Skip banner generation (faster, lower cost)")
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

    # 4b. Filter to today's articles only (IST = UTC+5:30)
    today_ist = datetime.now(IST).date()

    def is_today_ist(iso_string: str) -> bool:
        try:
            dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(IST).date() == today_ist
        except Exception:
            return True  # include if date cannot be parsed

    before = len(all_raw)
    all_raw = [a for a in all_raw if is_today_ist(a["published_at"])]
    print(f"   {len(all_raw)}/{before} articles are from today ({today_ist} IST)")

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

    # Balance candidates across categories so no single category dominates.
    # Use source_category as a proxy (GPT-4o may adjust later).
    # Each category gets at most ceil(limit / num_categories) slots.
    num_cats = len(NEWS_CATEGORIES)
    per_cat_limit = max(1, -(-args.limit // num_cats))  # ceiling division
    cat_counts: dict[str, int] = {c: 0 for c in NEWS_CATEGORIES}
    balanced: list[dict] = []
    overflow: list[dict] = []  # articles whose category is already full
    for c in candidates:
        cat = c.get("source_category", "finance")
        if cat not in cat_counts:
            cat = "finance"
        if cat_counts[cat] < per_cat_limit:
            balanced.append(c)
            cat_counts[cat] += 1
        else:
            overflow.append(c)
    # Fill remaining slots from overflow (maintains total = limit)
    remaining = args.limit - len(balanced)
    balanced.extend(overflow[:remaining])
    candidates = balanced[:args.limit]
    print(f"   Balanced selection: {cat_counts} (per-cat limit={per_cat_limit})")
    print(f"   Enriching {len(candidates)} articles with GPT-4o...\n")

    # 6. Enrich each candidate + generate banner
    generate_banners = not args.no_banners and bool(GEMINI_API_KEY)
    if generate_banners:
        print(f"   🎨 Banner generation: ON (Gemini 2.5 Flash Image)")
    else:
        print(f"   🎨 Banner generation: OFF")

    enriched_articles: list[dict] = []
    for i, raw in enumerate(candidates, 1):
        print(f"   [{i}/{len(candidates)}] {raw['headline'][:65]}")
        enriched = enrich_article_with_gpt4o(raw, openai_client)
        if enriched:
            slug = ensure_unique_slug(enriched["slug_base"], existing_slugs)
            enriched["slug"] = slug
            existing_slugs.add(slug)
            existing_headlines.add(enriched["headline"])

            # Generate AI banner using source image as visual reference
            if generate_banners:
                banner_url = generate_news_banner(
                    headline=enriched["headline"],
                    summary=enriched["summary"],
                    category=enriched.get("category", "finance"),
                    slug=slug,
                    source_image_url=raw.get("image_url"),
                    supabase=supabase,
                )
                if banner_url:
                    enriched["image_url"] = banner_url
                    enriched["image_alt"] = f"{enriched['headline']} — Rizz Jobs"

            enriched_articles.append(enriched)

    # 7. Upsert to Supabase
    if enriched_articles:
        count = upsert_articles(enriched_articles, supabase)
        print(f"\n✅  Done: {count}/{len(enriched_articles)} articles upserted to news_articles")
    else:
        print("\n✅  Done: no new articles to insert")


if __name__ == "__main__":
    main()

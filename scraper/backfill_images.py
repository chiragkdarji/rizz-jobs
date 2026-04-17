"""
Backfill news_articles.image_webp for all existing articles.

For each article with image_url set but image_webp null:
  1. Download the image
  2. Convert to WebP at ≤40 KB (reduce quality / dimensions until it fits)
  3. Upload to the `news-images` Supabase Storage bucket
  4. Write the public URL back to image_webp

Run:  python backfill_images.py
      python backfill_images.py --batch 50   # smaller batches
      python backfill_images.py --reprocess  # also re-process articles that already have image_webp
"""

import argparse
import io
import sys
import time
import requests
from PIL import Image
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")
BUCKET = "news-images"
TARGET_BYTES = 40 * 1024  # 40 KB
MAX_WIDTH = 800
FETCH_TIMEOUT = 15
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RizzJobsBot/1.0; +https://rizzjobs.in)",
}


def to_webp_bytes(raw: bytes) -> bytes | None:
    """Convert raw image bytes → WebP ≤40 KB. Returns None if impossible."""
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        print(f"    ERRPIL open failed: {e}")
        return None

    # Resize to max width
    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)

    # Try quality 80 → 60 → 40 → 20 at full size
    for quality in (80, 60, 40, 20):
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=6)
        if buf.tell() <= TARGET_BYTES:
            return buf.getvalue()

    # Still too big → shrink dimensions too
    for scale in (0.75, 0.6, 0.5, 0.4):
        small = img.resize(
            (max(1, int(img.width * scale)), max(1, int(img.height * scale))),
            Image.LANCZOS,
        )
        for quality in (80, 60, 40, 20):
            buf = io.BytesIO()
            small.save(buf, format="WEBP", quality=quality, method=6)
            if buf.tell() <= TARGET_BYTES:
                return buf.getvalue()

    return None


def download_image(url: str) -> bytes | None:
    """Download image bytes, falling back to weserv.nl proxy on 403/non-image response."""
    for attempt_url in (url, f"https://images.weserv.nl/?url={requests.utils.quote(url, safe='')}"):
        try:
            r = requests.get(attempt_url, headers=HEADERS, timeout=FETCH_TIMEOUT, stream=True)
            if r.status_code == 403 and attempt_url == url:
                print(f"    WARN403 on direct URL, retrying via weserv.nl...")
                continue
            r.raise_for_status()
            content_type = r.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                if attempt_url == url:
                    print(f"    WARNNot an image ({content_type}), retrying via weserv.nl...")
                    continue
                print(f"    ERRNot an image even via weserv.nl ({content_type})")
                return None
            return r.content
        except Exception as e:
            if attempt_url == url:
                print(f"    WARNDownload failed ({e}), retrying via weserv.nl...")
                continue
            print(f"    ERRDownload failed via weserv.nl: {e}")
            return None
    return None


def upload_webp(supabase: Client, slug: str, webp_bytes: bytes) -> str | None:
    path = f"articles/{slug}.webp"
    try:
        supabase.storage.from_(BUCKET).upload(
            path,
            webp_bytes,
            {"content-type": "image/webp", "cache-control": "public, max-age=2592000", "upsert": "true"},
        )
        result = supabase.storage.from_(BUCKET).get_public_url(path)
        # supabase-py 2.x returns the URL directly
        if isinstance(result, str):
            return result
        # older versions return a dict
        if isinstance(result, dict):
            return result.get("publicURL") or result.get("data", {}).get("publicUrl")
        return None
    except Exception as e:
        print(f"    ERRUpload failed: {e}")
        return None


def run(batch_size: int, reprocess: bool) -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("ERROR: SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_KEY) must be set in .env")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch articles needing processing
    query = (
        supabase.table("news_articles")
        .select("id, slug, image_url")
        .not_.is_("image_url", "null")
        .eq("is_published", True)
    )
    if not reprocess:
        query = query.is_("image_webp", "null")

    result = query.order("published_at", desc=True).execute()
    articles = result.data or []
    total = len(articles)
    print(f"Found {total} articles to process (batch_size={batch_size}, reprocess={reprocess})\n")

    ok = skip = fail = 0

    for i, article in enumerate(articles[:batch_size if batch_size else total], 1):
        slug = article["slug"]
        image_url = article["image_url"]
        print(f"[{i}/{min(batch_size or total, total)}] {slug}")
        print(f"    src: {image_url[:80]}...")

        raw = download_image(image_url)
        if not raw:
            fail += 1
            continue

        webp = to_webp_bytes(raw)
        if not webp:
            print(f"    ERRCould not compress to ≤40KB")
            fail += 1
            continue

        public_url = upload_webp(supabase, slug, webp)
        if not public_url:
            fail += 1
            continue

        # Write back
        try:
            supabase.table("news_articles").update({"image_webp": public_url}).eq("id", article["id"]).execute()
            print(f"    OK {len(webp) // 1024}KB -> {public_url[-60:]}")
            ok += 1
        except Exception as e:
            print(f"    ERRDB update failed: {e}")
            fail += 1

        # Small sleep to avoid hammering source hosts
        time.sleep(0.3)

    print(f"\n{'-' * 50}")
    print(f"Done -- ok={ok}  skip={skip}  fail={fail}  total={total}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--reprocess", action="store_true", help="Re-process articles that already have image_webp")
    args = parser.parse_args()
    run(args.batch, args.reprocess)

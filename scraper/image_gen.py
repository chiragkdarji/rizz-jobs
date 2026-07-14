"""
Banner Image Generator - template-based, zero cost.

Renders the site's own /api/og exam card (satori template) and uploads the
result to Supabase Storage. Replaced Gemini (gemini-2.5-flash-image) in
July 2026: Google set the free-tier quota for all image models to zero,
so AI banner generation silently stopped working on 2026-05-23.

The template renders the exact title text (AI models mangle long titles),
costs nothing, and has no rate limits.
"""
import io
import os
import re
from datetime import datetime
from urllib.parse import urlencode

import requests
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Base URL of the deployed site whose /api/og route renders the banner.
# Override with OG_BASE_URL=http://localhost:3000 to render against a local build.
OG_BASE_URL = os.getenv("OG_BASE_URL", "https://rizzjobs.in").rstrip("/")

# Prefer the service key: storage upload with upsert needs UPDATE permission,
# which RLS denies to the anon key.
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

BUCKET_NAME = "job-banners"
BUCKET_PUBLIC_PREFIX = f"/object/public/{BUCKET_NAME}/"

# Placeholder strings that must not be shown as a real deadline
VAGUE_DEADLINES = {
    "", "tba", "to be announced", "to be notified", "to be declared",
    "n/a", "na", "not available", "not announced", "yet to be announced",
}


def _delete_old_banner(old_url: str | None) -> None:
    """Delete old banner from storage given its public URL."""
    if not old_url:
        return
    try:
        idx = old_url.find(BUCKET_PUBLIC_PREFIX)
        if idx != -1:
            old_path = old_url[idx + len(BUCKET_PUBLIC_PREFIX):]
            supabase.storage.from_(BUCKET_NAME).remove([old_path])
    except Exception as e:
        print(f"  ⚠️ Could not delete old banner: {e}")


def _format_deadline(deadline: str | None) -> str | None:
    """Normalize a deadline to a display string like '12 Jan 2026', or None."""
    if not deadline or deadline.strip().lower() in VAGUE_DEADLINES:
        return None
    raw = deadline.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw[:19] if "T" in raw else raw, fmt).strftime("%d %b %Y")
        except ValueError:
            continue
    # Unparseable but not a known placeholder: show as-is (e.g. "15 March 2026")
    return raw if len(raw) <= 24 else None


def generate_banner(
    title: str,
    summary: str = "",
    old_image_url: str | None = None,
    slug: str | None = None,
    deadline: str | None = None,
    category: str | None = None,
) -> str | None:
    """
    Renders a template banner via the site's /api/og route and uploads it.
    Deletes old_image_url from storage if provided.
    Returns the public URL of the uploaded WebP image, or None on failure.
    `summary` is kept for call-site compatibility; the template does not use it.
    """
    try:
        print(f"  🎨 Generating banner for: {title}")
        params: dict[str, str] = {"type": "exam", "title": title[:160]}
        display_deadline = _format_deadline(deadline)
        if display_deadline:
            params["deadline"] = display_deadline
        if category:
            params["category"] = category[:40]

        resp = requests.get(f"{OG_BASE_URL}/api/og?{urlencode(params)}", timeout=30)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            print(f"  ❌ /api/og returned non-image ({content_type}) for: {title}")
            return None

        # Convert PNG -> WebP (quality 80), same output format as before
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        webp_buf = io.BytesIO()
        img.save(webp_buf, format="WEBP", quality=80, method=6)
        image_bytes = webp_buf.getvalue()

        _delete_old_banner(old_image_url)

        # SEO-friendly filename: {slug}-government-job-notification.webp
        safe_slug = re.sub(r"[^a-z0-9-]", "-", (slug or title).lower())[:80]
        file_path = f"banners/{safe_slug}-government-job-notification.webp"

        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=image_bytes,
            file_options={"content-type": "image/webp", "upsert": "true"},
        )

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        print(f"  ✅ Banner uploaded: {public_url}")
        return public_url

    except Exception as e:
        print(f"  ❌ Banner generation failed for {title}: {e}")
        return None


if __name__ == "__main__":
    # Quick test
    url = generate_banner(
        "UPSC Civil Services 2026",
        "Union Public Service Commission has announced the Civil Services Examination 2026.",
        deadline="2026-08-15",
        category="UPSC",
    )
    print(f"Result: {url}")

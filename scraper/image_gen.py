"""
Banner Image Generator using Gemini 2.5 Flash Image (Nano Banana).
Generates professional job notification banners and uploads to Supabase Storage.
"""
import os
import io
import re
import base64
from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Initialize clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

BUCKET_NAME = "job-banners"


BUCKET_PUBLIC_PREFIX = f"/object/public/{BUCKET_NAME}/"


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


def generate_banner(title: str, summary: str, old_image_url: str | None = None, slug: str | None = None) -> str | None:
    """
    Generates a professional job banner image using Gemini.
    Deletes old_image_url from storage if provided.
    Returns the public URL of the uploaded image, or None on failure.
    """
    prompt = f"""Create a professional, modern banner image for a government job notification.

Job Title: {title}
Summary: {summary}

STRICT Design Requirements:
- Image MUST be exactly 1280x720 pixels (16:9 landscape widescreen ratio — NOT square)
- Clean, corporate design with a gradient background (dark blue to indigo/purple tones)
- Include the text "{title}" prominently in bold, clear white typography
- Add subtle government/official visual elements (like a shield icon, document icon, or official seal silhouette)
- Professional, trustworthy, and authoritative feel
- DO NOT include any real government logos or emblems
- DO NOT include any watermark, brand name, logo, or text overlay other than the job title and summary
- Keep text minimal and readable
- No text saying "generated" or "created by" anywhere
"""

    try:
        print(f"  🎨 Generating banner for: {title}")
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        # Extract the generated image
        for part in response.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                if isinstance(image_bytes, str):
                    image_bytes = base64.b64decode(image_bytes)

                # Convert to WebP (quality 80) — ~5x smaller than PNG
                img = Image.open(io.BytesIO(image_bytes))
                webp_buf = io.BytesIO()
                img.save(webp_buf, format="WEBP", quality=80)
                image_bytes = webp_buf.getvalue()

                # Delete old banner before uploading new one
                _delete_old_banner(old_image_url)

                # SEO-friendly filename: {slug}-government-job-notification.webp
                safe_slug = re.sub(r"[^a-z0-9-]", "-", (slug or title).lower())[:80]
                file_path = f"banners/{safe_slug}-government-job-notification.webp"

                supabase.storage.from_(BUCKET_NAME).upload(
                    path=file_path,
                    file=image_bytes,
                    file_options={"content-type": "image/webp"}
                )

                # Get public URL
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
                print(f"  ✅ Banner uploaded: {public_url}")
                return public_url

        print(f"  ⚠️ No image generated for: {title}")
        return None

    except Exception as e:
        print(f"  ❌ Banner generation failed for {title}: {e}")
        return None


if __name__ == "__main__":
    # Quick test
    url = generate_banner(
        "UPSC Civil Services 2026",
        "Union Public Service Commission has announced the Civil Services Examination 2026."
    )
    print(f"Result: {url}")

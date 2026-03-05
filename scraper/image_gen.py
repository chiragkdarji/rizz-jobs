"""
AI Banner Image Generator using Gemini 2.5 Flash Image (Nano Banana).
Generates professional job notification banners and uploads to Supabase Storage.
"""
import os
import io
import base64
import uuid
from google import genai
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Initialize clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

BUCKET_NAME = "job-banners"


def generate_banner(title: str, summary: str) -> str | None:
    """
    Generates a professional job banner image using Gemini 2.5 Flash Image.
    Returns the public URL of the uploaded image, or None on failure.
    """
    prompt = f"""Create a professional, modern banner image for a government job notification.

Job Title: {title}
Summary: {summary}

Design Requirements:
- Clean, corporate design with a gradient background (dark blue to indigo/purple tones)
- Include the text "{title}" prominently in bold, clear white typography
- Add subtle government/official visual elements (like a shield icon, document icon, or official seal silhouette)
- Include a small "GovExams" watermark in the corner
- Aspect ratio should be landscape (16:9)
- Professional, trustworthy, and authoritative feel
- DO NOT include any real government logos or emblems
- Keep text minimal and readable
"""

    try:
        print(f"  🎨 Generating banner for: {title}")
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
        )

        # Extract the generated image
        for part in response.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                if isinstance(image_bytes, str):
                    image_bytes = base64.b64decode(image_bytes)
                
                # Upload to Supabase Storage
                file_name = f"banner_{uuid.uuid4().hex[:12]}.png"
                file_path = f"banners/{file_name}"

                supabase.storage.from_(BUCKET_NAME).upload(
                    path=file_path,
                    file=image_bytes,
                    file_options={"content-type": "image/png"}
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

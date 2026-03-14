import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def get_latest_notifications(limit=10):
    """
    Fetches the latest notifications from the database.
    """
    try:
        response = supabase.table("notifications").select("*").order("created_at", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching from DB: {e}")
        return []

def upsert_notifications(notifications):
    """
    Inserts or updates notifications in the database.
    Deduplicates by (title, source) before batching to Supabase.
    """
    if not notifications:
        return
        
    # Deduplicate locally by slug to match the database unique constraint
    unique_notifications = {}
    for n in notifications:
        target_key = n.get("slug")
        if not target_key: continue
        # Add updated_at timestamp to track when this notification was last synced
        n["updated_at"] = datetime.utcnow().isoformat()
        # Strip any temp scraper-only keys (prefixed with _) before DB upsert
        clean = {k: v for k, v in n.items() if not k.startswith("_")}
        unique_notifications[target_key] = clean

    deduped_list = list(unique_notifications.values())

    # Determine which slugs already exist (to classify new vs updated)
    all_slugs = [n["slug"] for n in deduped_list if n.get("slug")]
    existing_slugs = set()
    if all_slugs:
        try:
            existing_res = supabase.table("notifications").select("slug").in_("slug", all_slugs).execute()
            existing_slugs = {row["slug"] for row in (existing_res.data or [])}
        except Exception:
            pass  # Non-critical — log will just have 0 for existing count

    new_entries = [{"title": n["title"], "slug": n["slug"], "link": n.get("link", "")} for n in deduped_list if n["slug"] not in existing_slugs]
    updated_entries = [{"title": n["title"], "slug": n["slug"]} for n in deduped_list if n["slug"] in existing_slugs]

    try:
        print(f"Syncing {len(deduped_list)} unique notifications to Supabase...")
        response = supabase.table("notifications").upsert(
            deduped_list,
            on_conflict="slug"
        ).execute()
        print(f"✅ Successfully synced to database.")

        # Log this scraper run
        try:
            supabase.table("scraper_runs").insert({
                "total_synced": len(deduped_list),
                "new_count": len(new_entries),
                "updated_count": len(updated_entries),
                "new_entries": new_entries,
                "updated_entries": updated_entries,
                "status": "completed",
            }).execute()
            print(f"📋 Run logged: {len(new_entries)} new, {len(updated_entries)} updated.")
        except Exception as log_err:
            print(f"⚠️ Could not write scraper run log: {log_err}")

        return response.data
    except Exception as e:
        # Log failed run
        try:
            supabase.table("scraper_runs").insert({
                "total_synced": 0,
                "new_count": 0,
                "updated_count": 0,
                "new_entries": [],
                "updated_entries": [],
                "status": "failed",
                "error_message": str(e)[:500],
            }).execute()
        except Exception:
            pass
        print(f"❌ Error upserting to DB: {e}")
        raise e

def upload_notification_documents(notification_id: str, pdf_links: list, slug: str):
    """
    Downloads PDFs found by the scraper and uploads them to Supabase Storage.
    Inserts records into notification_documents table (upsert by storage_path).
    """
    import requests as req

    for pdf in pdf_links:
        try:
            print(f"  📄 Downloading PDF: {pdf['filename']}...")
            response = req.get(
                pdf["url"],
                timeout=15,
                headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
            )
            if response.status_code != 200:
                print(f"  ❌ HTTP {response.status_code}: {pdf['url']}")
                continue

            content = response.content

            # Verify PDF magic bytes
            if content[:4] != b"%PDF":
                print(f"  ⚠️ Not a valid PDF: {pdf['filename']}")
                continue

            if len(content) > 15 * 1024 * 1024:
                print(f"  ⚠️ PDF too large (>15MB): {pdf['filename']}")
                continue

            storage_path = f"{slug}/{pdf['filename']}"

            supabase.storage.from_("notification-documents").upload(
                storage_path,
                content,
                {"content-type": "application/pdf", "upsert": "true"},
            )

            public_url = supabase.storage.from_("notification-documents").get_public_url(storage_path)

            supabase.table("notification_documents").upsert(
                {
                    "notification_id": notification_id,
                    "file_name": pdf["filename"],
                    "storage_path": storage_path,
                    "file_url": public_url,
                    "document_type": pdf["document_type"],
                    "file_size_bytes": len(content),
                    "scraped": True,
                },
                on_conflict="storage_path",
            ).execute()

            print(f"  ✅ PDF uploaded: {pdf['filename']}")

        except Exception as e:
            print(f"  ❌ Error with PDF {pdf.get('filename')}: {e}")


if __name__ == "__main__":
    # Test connection
    print("Testing DB connection...")
    # This will fail until the user provides keys, but the logic is sound.

"""
Storage Cleanup Script
- Keeps banner images for the 50 most recent active notifications; deletes the rest.
- Deletes all PDF/document files from the notification-documents bucket.
- Clears all rows from the notification_documents table.

Run once:  python cleanup_storage.py
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

BANNER_BUCKET = "job-banners"
DOCS_BUCKET = "notification-documents"
KEEP_COUNT = 50


def cleanup_banners() -> None:
    print("\n=== Banner Cleanup ===")

    # 1. Get the 50 most recent notifications that have a banner
    result = supabase.from_("notifications") \
        .select("id, title, visuals") \
        .order("created_at", desc=True) \
        .limit(KEEP_COUNT) \
        .execute()

    recent = result.data or []

    # Collect banner URLs/paths to KEEP
    keep_paths: set[str] = set()
    marker = f"/object/public/{BANNER_BUCKET}/"
    for notif in recent:
        visuals = notif.get("visuals") or {}
        url = visuals.get("notification_image") if isinstance(visuals, dict) else None
        if url:
            idx = url.find(marker)
            if idx != -1:
                keep_paths.add(url[idx + len(marker):])

    print(f"  Notifications checked : {len(recent)}")
    print(f"  Banner paths to keep  : {len(keep_paths)}")

    # 2. List all files in the banners/ folder
    list_result = supabase.storage.from_(BANNER_BUCKET).list("banners")
    all_files = list_result or []
    all_paths = [f"banners/{f['name']}" for f in all_files if f.get("name")]

    print(f"  Total files in bucket : {len(all_paths)}")

    # 3. Delete files NOT in keep set
    to_delete = [p for p in all_paths if p not in keep_paths]
    print(f"  Files to delete       : {len(to_delete)}")

    if not to_delete:
        print("  Nothing to delete.")
        return

    # Delete in batches of 100
    batch_size = 100
    deleted = 0
    for i in range(0, len(to_delete), batch_size):
        batch = to_delete[i:i + batch_size]
        supabase.storage.from_(BANNER_BUCKET).remove(batch)
        deleted += len(batch)
        print(f"  Deleted {deleted}/{len(to_delete)} files...")

    print(f"  ✅ Banner cleanup done — {len(to_delete)} files removed.")


def _list_all_files(bucket: str, prefix: str = "") -> list[str]:
    """Recursively list all file paths in a bucket folder."""
    items = supabase.storage.from_(bucket).list(prefix) or []
    paths: list[str] = []
    for item in items:
        name = item.get("name")
        if not name:
            continue
        full = f"{prefix}/{name}" if prefix else name
        # Supabase returns folders with id=None and metadata=None
        if item.get("id") is None and item.get("metadata") is None:
            paths.extend(_list_all_files(bucket, full))  # recurse into folder
        else:
            paths.append(full)
    return paths


def cleanup_documents() -> None:
    print("\n=== Document Cleanup ===")

    # 1. Delete all DB records
    del_result = supabase.from_("notification_documents") \
        .delete() \
        .neq("id", "00000000-0000-0000-0000-000000000000") \
        .execute()
    deleted_rows = len(del_result.data) if del_result.data else 0
    print(f"  DB rows deleted: {deleted_rows}")

    # 2. List all files in storage recursively and delete
    all_files = _list_all_files(DOCS_BUCKET)
    print(f"  Storage files found  : {len(all_files)}")

    if not all_files:
        print("  Nothing to delete.")
        return

    batch_size = 100
    deleted = 0
    for i in range(0, len(all_files), batch_size):
        batch = all_files[i:i + batch_size]
        supabase.storage.from_(DOCS_BUCKET).remove(batch)
        deleted += len(batch)

    print(f"  Storage files deleted: {deleted}")
    print("  ✅ Document cleanup done.")


if __name__ == "__main__":
    print("Starting storage cleanup...")
    cleanup_banners()
    cleanup_documents()
    print("\nDone.")

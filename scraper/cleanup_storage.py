"""
One-time storage cleanup.
- job-banners: deletes non-WebP files (old PNGs), keeps .webp files
- notification-documents: deletes ALL files
- notification_documents table: cleared

Run: python cleanup_storage.py
"""
import os
import base64
from supabase import create_client  # type: ignore[import-untyped]
from dotenv import load_dotenv  # type: ignore[import-untyped]

load_dotenv()

# Requires service role key to bypass RLS and list/delete storage files
# Add SUPABASE_SERVICE_KEY to scraper/.env (Project Settings → API → service_role)
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if key:
    try:
        payload = base64.b64decode(key.split(".")[1] + "==").decode()
        if "service_role" not in payload:
            print("WARNING: Not using service role key — listing may return empty results.")
            print("  Add SUPABASE_SERVICE_KEY=<service_role_key> to scraper/.env\n")
    except Exception:
        pass

supabase = create_client(url, key)


def list_all_files(bucket: str, prefix: str = "") -> list:  # type: ignore[type-arg]
    """Recursively list all file paths in a bucket folder, with pagination."""
    paths: list[str] = []
    offset: int = 0
    while True:
        try:
            items = supabase.storage.from_(bucket).list(prefix, {"limit": 1000, "offset": offset}) or []
        except Exception as e:
            print(f"  list({prefix!r}, offset={offset}) failed: {e}")
            break

        if not items:
            break

        for item in items:
            name = item.get("name")
            if not name:
                continue
            full_path = f"{prefix}/{name}" if prefix else name
            # Folder: id is None AND metadata is None
            if item.get("id") is None and item.get("metadata") is None:
                paths.extend(list_all_files(bucket, full_path))
            else:
                paths.append(full_path)

        if len(items) < 1000:
            break  # last page
        offset = offset + 1000  # type: ignore[operator]

    return paths


def delete_files(bucket: str, paths: list) -> None:  # type: ignore[type-arg]
    """Delete a list of file paths in batches of 100."""
    str_paths: list[str] = [str(p) for p in paths]
    n = len(str_paths)
    for i in range(0, n, 100):
        batch = str_paths[i:i + 100]  # type: ignore[misc]
        supabase.storage.from_(bucket).remove(batch)
        preview = ", ".join(batch[j] for j in range(min(3, len(batch))))
        print(f"  Deleted batch: {preview}{'...' if len(batch) > 3 else ''}")


# ── job-banners: delete non-WebP only, keep .webp ──────────────────────────
print("=== Scanning job-banners ===")
all_banner_files = list_all_files("job-banners")
print(f"  Found {len(all_banner_files)} total files")

to_delete = [p for p in all_banner_files if not str(p).lower().endswith(".webp")]
to_keep   = [p for p in all_banner_files if str(p).lower().endswith(".webp")]

print(f"  Keeping {len(to_keep)} .webp files")
print(f"  Deleting {len(to_delete)} non-WebP files")

if to_delete:
    delete_files("job-banners", to_delete)
print(f"  Done — {len(to_delete)} non-WebP files removed.\n")

# ── notification-documents: delete everything ──────────────────────────────
print("=== Scanning notification-documents ===")
all_doc_files = list_all_files("notification-documents")
print(f"  Found {len(all_doc_files)} files")

if all_doc_files:
    delete_files("notification-documents", all_doc_files)
print(f"  Done — {len(all_doc_files)} files removed.\n")

# ── Clear notification_documents table ────────────────────────────────────
print("=== Clearing notification_documents table ===")
result = supabase.from_("notification_documents") \
    .delete() \
    .neq("id", "00000000-0000-0000-0000-000000000000") \
    .execute()
rows = len(result.data) if result.data else 0
print(f"  Done — {rows} rows deleted.\n")

print("Storage cleanup complete.")

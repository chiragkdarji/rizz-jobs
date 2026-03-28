import os
import json
from urllib.parse import urlparse
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# ─────────────────────────────────────────────
# Vague / placeholder values that should NEVER
# replace real data already in the database.
# ─────────────────────────────────────────────
VAGUE_PHRASES = {
    "", "n/a", "na", "tba", "tbd",
    "to be announced", "to be notified", "to be declared",
    "will be announced", "will be notified", "will be declared",
    "yet to be announced", "not specified", "not available",
    "not applicable", "as per requirement", "announced later",
    "check official website", "refer official notification",
}

# URLs that are known to be generic/placeholder — never preferred over a real link.
BLOCKED_URL_PATTERNS = [
    "official_site.com", "example.com", "placeholder",
    "yourwebsite", "website.com",
]


def _is_vague(val) -> bool:
    """Return True if val is empty or a known vague phrase."""
    return str(val or "").strip().lower() in VAGUE_PHRASES


def _parse_json_field(val) -> dict:
    """Safely coerce a DB value to dict (handles JSONB strings and dicts)."""
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            result = json.loads(val)
            return result if isinstance(result, dict) else {}
        except Exception:
            return {}
    return {}


def _parse_list_field(val) -> list:
    """Safely coerce a DB value to list."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            result = json.loads(val)
            return result if isinstance(result, list) else [result]
        except Exception:
            return [val] if val.strip() else []
    return []


def _pick_better_text(old_val, new_val) -> str:
    """
    Return whichever text is more informative.
    Never replace real data with a vague placeholder.
    When both are real, prefer the longer one.
    """
    old_s = str(old_val or "").strip()
    new_s = str(new_val or "").strip()

    old_vague = _is_vague(old_s)
    new_vague = _is_vague(new_s)

    if new_vague and not old_vague:
        return old_s      # Never downgrade to vague
    if old_vague and not new_vague:
        return new_s      # Upgrade from vague to real
    if not new_s:
        return old_s      # Never overwrite with empty
    # Both real — prefer longer (more detail)
    return new_s if len(new_s) >= len(old_s) else old_s


AGGREGATOR_DOMAINS = [
    "sarkari", "freejobalert", "jagranjosh", "testbook",
    "rojgar", "freshersworld", "employment", "naukri",
    "shine.com", "indeed", "timesjobs",
]


def _pick_better_link(old_url: str, new_url: str) -> str:
    """
    Pick the more specific/reliable URL.

    KEY POLICY: If the existing URL is NOT from an aggregator site, it is
    treated as manually curated and is NEVER replaced by the scraper.
    This protects URLs that admins have set by hand.
    """
    old_url = (old_url or "").strip()
    new_url = (new_url or "").strip()

    if not new_url:
        return old_url
    if not old_url:
        return new_url
    if new_url == old_url:
        return old_url

    # Reject known bad/placeholder URLs in the new candidate
    new_lower = new_url.lower()
    if any(p in new_lower for p in BLOCKED_URL_PATTERNS):
        print(f"    ⚠️  Blocked URL rejected: {new_url}")
        return old_url

    # If the existing URL is NOT an aggregator, keep it — it was likely
    # manually curated by an admin and must not be overwritten by the scraper.
    old_lower = old_url.lower()
    old_is_aggregator = any(agg in old_lower for agg in AGGREGATOR_DOMAINS)
    if not old_is_aggregator:
        print(f"    🔒 Keeping manually curated URL (not overwriting with scraper URL)")
        return old_url

    # Old URL is an aggregator — try to upgrade to something better
    try:
        old_depth = len([p for p in urlparse(old_url).path.split("/") if p])
        new_depth = len([p for p in urlparse(new_url).path.split("/") if p])

        if new_depth >= old_depth:
            return new_url
        else:
            print(f"    ℹ️  Keeping more specific old URL (depth {old_depth} vs {new_depth})")
            return old_url
    except Exception:
        return new_url


def _merge_list_union(old_val, new_val) -> list:
    """Union of two lists, deduped, order-preserving."""
    old_list = _parse_list_field(old_val) if not isinstance(old_val, list) else old_val
    new_list = _parse_list_field(new_val) if not isinstance(new_val, list) else new_val
    seen: set = set()
    result = []
    for item in old_list + new_list:
        key = str(item).strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _merge_date_dict(old_val, new_val) -> dict:
    """
    Merge important_dates dicts.
    New values override old for same keys only if non-vague.
    Old keys not in new are preserved.
    """
    old_d = _parse_json_field(old_val)
    new_d = _parse_json_field(new_val)
    merged = dict(old_d)
    for k, v in new_d.items():
        if v and not _is_vague(v):
            merged[k] = v         # New has real value — take it
        elif k not in merged:
            merged[k] = v         # Key didn't exist before — add it
    return merged


def _smart_merge_details(old_details_raw, new_details_raw) -> dict:
    """
    Smart per-sub-field merge of the details JSONB column.
    Rules:
      categories         → union both lists
      selection_process  → keep whichever list is longer (more steps)
      important_dates    → merge dicts (non-vague new values override old)
      everything else    → pick_better_text (never downgrade to vague/shorter)
    """
    old_d = _parse_json_field(old_details_raw)
    new_d = _parse_json_field(new_details_raw)
    merged = dict(old_d)

    for key, new_val in new_d.items():
        old_val = old_d.get(key)

        if key == "categories":
            merged[key] = _merge_list_union(old_val, new_val)

        elif key == "selection_process":
            old_list = old_val if isinstance(old_val, list) else _parse_list_field(old_val)
            new_list = new_val if isinstance(new_val, list) else _parse_list_field(new_val)
            # More steps = more informative
            merged[key] = new_list if len(new_list) >= len(old_list) else old_list

        elif key == "important_dates":
            merged[key] = _merge_date_dict(old_val, new_val)

        elif key == "faqs":
            # Keep whichever FAQ list is longer (more Q&A = more informative)
            old_list = old_val if isinstance(old_val, list) else []
            new_list = new_val if isinstance(new_val, list) else []
            merged[key] = new_list if len(new_list) >= len(old_list) else old_list

        elif key == "direct_answer":
            # Keep whichever highlights list is longer
            old_list = old_val if isinstance(old_val, list) else []
            new_list = new_val if isinstance(new_val, list) else []
            merged[key] = new_list if len(new_list) >= len(old_list) else old_list

        else:
            # vacancies, eligibility, application_fee, etc.
            best = _pick_better_text(old_val, new_val)
            merged[key] = best if best else (old_val or new_val)

    return merged


def smart_merge(old_record: dict, new_record: dict) -> dict:
    """
    Merge an existing DB record with newly scraped data.

    Core philosophy:
      - NEVER replace specific information with vague/empty data.
      - NEVER downgrade a working specific URL to a generic homepage.
      - For dates: only update if the new value is a real date (not empty/vague).
      - For lists: union (accumulate); never shrink.
      - For text: prefer the longer, more detailed value.
      - Always carry forward all fields present in the old record.
    """
    merged = dict(old_record)

    # Title: prefer more specific / longer
    merged["title"] = (
        _pick_better_text(old_record.get("title"), new_record.get("title"))
        or old_record.get("title") or new_record.get("title", "")
    )

    # Link: prefer deeper/more specific URL
    merged["link"] = _pick_better_link(
        old_record.get("link", ""), new_record.get("link", "")
    )

    # AI summary: prefer longer
    merged["ai_summary"] = _pick_better_text(
        old_record.get("ai_summary"), new_record.get("ai_summary")
    )

    # Dates: keep old if new is empty or vague
    for date_field in ("exam_date", "deadline"):
        new_val = new_record.get(date_field)
        old_val = old_record.get(date_field)
        if new_val and not _is_vague(new_val):
            merged[date_field] = new_val      # New has a real date — take it
        else:
            merged[date_field] = old_val      # Preserve the existing date

    # Details: smart sub-field merge
    merged["details"] = _smart_merge_details(
        old_record.get("details"), new_record.get("details")
    )

    # SEO: carry forward if new record has it and old doesn't (or new is richer)
    old_seo = _parse_json_field(old_record.get("seo"))
    new_seo = _parse_json_field(new_record.get("seo"))
    if new_seo and len(str(new_seo)) >= len(str(old_seo)):
        merged["seo"] = new_seo
    elif old_seo:
        merged["seo"] = old_seo

    # Visuals: preserve notification_image (banner) from old record if new is null
    old_vis = _parse_json_field(old_record.get("visuals"))
    new_vis = _parse_json_field(new_record.get("visuals"))
    if old_vis or new_vis:
        merged_vis = {**old_vis, **{k: v for k, v in new_vis.items() if v is not None}}
        # Never overwrite a real banner URL with null
        if old_vis.get("notification_image") and not new_vis.get("notification_image"):
            merged_vis["notification_image"] = old_vis["notification_image"]
        merged["visuals"] = merged_vis

    # Always update the sync timestamp
    merged["updated_at"] = new_record.get("updated_at", datetime.utcnow().isoformat())

    # Carry forward any new top-level fields the old record didn't have
    for key, val in new_record.items():
        if key not in merged and not key.startswith("_"):
            merged[key] = val

    return merged


# ─────────────────────────────────────────────
# Diff helper — compares old DB record vs final
# merged record to show what actually changed.
# ─────────────────────────────────────────────
TRACKED_FIELDS = ["title", "link", "ai_summary", "exam_date", "deadline"]
DETAILS_SUBFIELDS = [
    "vacancies", "eligibility", "application_fee",
    "important_dates", "selection_process", "categories",
    "age_limit", "what_is_the_update",
]


def compute_diff(old_record: dict, merged_record: dict) -> list:
    """Return list of {field, old, new} for fields that actually changed."""
    changes = []
    for field in TRACKED_FIELDS:
        old_val = str(old_record.get(field) or "").strip()
        new_val = str(merged_record.get(field) or "").strip()
        if old_val != new_val:
            changes.append({"field": field, "old": old_val[:300], "new": new_val[:300]})

    old_d = _parse_json_field(old_record.get("details"))
    new_d = _parse_json_field(merged_record.get("details"))
    for sub in DETAILS_SUBFIELDS:
        old_sub = str(old_d.get(sub) or "").strip()
        new_sub = str(new_d.get(sub) or "").strip()
        if old_sub != new_sub:
            changes.append({"field": f"details.{sub}", "old": old_sub[:300], "new": new_sub[:300]})

    return changes


# ─────────────────────────────────────────────
# Main DB functions
# ─────────────────────────────────────────────

def get_latest_notifications(limit=10):
    """Fetches the latest notifications from the database."""
    try:
        response = supabase.table("notifications").select("*").order("created_at", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching from DB: {e}")
        return []


def fetch_categories() -> list:
    """
    Fetches all active categories from the categories table.
    Returns list of dicts with 'name' and 'keywords' keys.
    Used by parser.py to dynamically assign categories instead of using a hardcoded list.
    """
    try:
        response = (
            supabase.table("categories")
            .select("name, keywords")
            .eq("is_active", True)
            .order("sort_order")
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"Warning: Could not fetch categories from DB: {e}")
        # Fallback to static list so scraper doesn't break if categories table is missing
        return [
            {"name": "Banking", "keywords": ["bank", "ibps", "sbi", "rbi", "po", "clerk"]},
            {"name": "Railway", "keywords": ["railway", "rrb", "ntpc", "group d", "alp"]},
            {"name": "Defense / Police", "keywords": ["army", "navy", "air force", "crpf", "bsf", "police", "nda", "cds"]},
            {"name": "UPSC / SSC", "keywords": ["upsc", "ssc", "ias", "cgl", "chsl", "mts"]},
            {"name": "Teaching", "keywords": ["teacher", "kvs", "nvs", "ctet", "tet", "dsssb"]},
            {"name": "Engineering", "keywords": ["engineer", "drdo", "isro", "barc", "gate", "je", "ae"]},
            {"name": "Medical", "keywords": ["medical", "doctor", "nurse", "aiims", "nhm", "esic"]},
            {"name": "PSU", "keywords": ["psu", "ongc", "bhel", "ntpc", "sail", "coal india"]},
            {"name": "State Jobs", "keywords": ["state", "uppsc", "bpsc", "mpsc", "rpsc", "pcs"]},
            {"name": "10th / 12th Pass", "keywords": ["10th pass", "12th pass", "matric", "apprentice", "constable"]},
        ]


def upsert_notifications(notifications):
    """
    Inserts or updates notifications in the database.
    - New entries are inserted as-is.
    - Existing entries are smart-merged (never loses data, only gains).
    - The scraper log records the actual field-level changes made.
    """
    if not notifications:
        return

    # Deduplicate locally by slug
    unique_notifications: dict = {}
    for n in notifications:
        target_key = n.get("slug")
        if not target_key:
            continue
        n["updated_at"] = datetime.utcnow().isoformat()
        clean = {k: v for k, v in n.items() if not k.startswith("_")}
        unique_notifications[target_key] = clean

    deduped_list = list(unique_notifications.values())

    # Fetch existing DB records for all slugs (to enable smart merge + diff)
    all_slugs = [n["slug"] for n in deduped_list if n.get("slug")]
    existing_by_slug: dict = {}
    if all_slugs:
        try:
            existing_res = supabase.table("notifications").select(
                "slug, title, link, ai_summary, exam_date, deadline, details"
            ).in_("slug", all_slugs).execute()
            existing_by_slug = {row["slug"]: row for row in (existing_res.data or [])}
        except Exception as e:
            print(f"⚠️  Could not fetch existing records for merge: {e}")

    # Build the final list to upsert, applying smart merge for existing entries
    final_list = []
    new_entries = []
    updated_entries = []
    skipped_count = 0

    for n in deduped_list:
        slug = n["slug"]
        if slug not in existing_by_slug:
            # Brand new notification — insert as-is
            final_list.append(n)
            new_entries.append({"title": n["title"], "slug": slug, "link": n.get("link", "")})
        else:
            # Existing notification — smart merge
            old = existing_by_slug[slug]
            merged = smart_merge(old, n)
            changes = compute_diff(old, merged)

            if changes:
                final_list.append(merged)
                updated_entries.append({"title": merged["title"], "slug": slug, "changes": changes})
                print(f"  ✏️  Updated ({len(changes)} changes): {merged['title']}")
            else:
                # Smart merge produced no actual changes — skip the DB write
                skipped_count += 1
                print(f"  ✓  No changes: {n.get('title', slug)}")

    if not final_list:
        print(f"ℹ️  Nothing to write ({skipped_count} entries already up to date).")
        try:
            supabase.table("scraper_runs").insert({
                "total_synced": len(deduped_list),
                "new_count": 0,
                "updated_count": 0,
                "new_entries": [],
                "updated_entries": [],
                "status": "completed",
            }).execute()
        except Exception:
            pass
        return []

    try:
        print(f"Syncing {len(final_list)} notifications to Supabase "
              f"({len(new_entries)} new, {len(updated_entries)} updated, {skipped_count} unchanged)...")
        response = supabase.table("notifications").upsert(
            final_list,
            on_conflict="slug"
        ).execute()
        print("✅ Successfully synced to database.")

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
            print(f"📋 Run logged: {len(new_entries)} new, {len(updated_entries)} updated, {skipped_count} unchanged.")
        except Exception as log_err:
            print(f"⚠️  Could not write scraper run log: {log_err}")

        return response.data

    except Exception as e:
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
    print("Testing DB connection...")

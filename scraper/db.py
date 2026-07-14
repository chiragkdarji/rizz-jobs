import os
import json
import re
from urllib.parse import urlparse
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
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
    "google.com/search", "google.co.in/search",
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


# Lifecycle words: different stages of the SAME recruitment must map to the
# same entity_key so they update one row instead of creating duplicates.
_LIFECYCLE_WORDS = re.compile(
    r"\b(notification|recruitment|online|form|apply|application|out|last|date|"
    r"extended|extension|admit|card|answer|key|result|merit|list|exam|city|slip|"
    r"releasing|soon|posts?|vacancy|vacancies|for|the|of|and|various|correction|"
    r"window|re[- ]?open(?:ed)?|started?|closing|begin|link|active|download|check|"
    r"declared|announced|hall|ticket|call|letter|status|update[ds]?|latest|new)\b"
)


def compute_entity_key(title: str) -> str:
    """
    Normalize a title to a recruitment-entity key: org + post tokens + year,
    with lifecycle words stripped and tokens sorted. 'SSC CGL Notification 2026',
    'SSC CGL Online Form 2026' and 'SSC CGL Admit Card 2026' all share one key.
    """
    t = title.lower()
    years = re.findall(r"20\d\d", t)
    t = re.sub(r"20\d\d", " ", t)
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    t = _LIFECYCLE_WORDS.sub(" ", t)
    tokens = sorted(set(w for w in t.split() if len(w) > 1))
    if years:
        tokens.append(max(years))
    return "-".join(tokens)[:200]


def verify_dedup_ready() -> None:
    """
    Abort the run if the pg_trgm dedup function is unavailable.
    A scraper that cannot check for duplicates must not write.
    """
    try:
        supabase.rpc(
            "find_similar_notification",
            {"search_title": "dedup readiness probe", "threshold": 0.99}
        ).execute()
    except Exception as e:
        raise RuntimeError(
            f"pg_trgm dedup function unavailable ({e}). "
            "Apply supabase migration find_similar_notification() before scraping."
        ) from e


def find_db_duplicate_by_entity_key(entity_key: str) -> dict | None:
    """Exact entity-key match: catches lifecycle variants of the same recruitment."""
    if not entity_key:
        return None
    res = supabase.table("notifications").select("id, slug, title").eq(
        "entity_key", entity_key
    ).eq("is_active", True).limit(1).execute()
    return res.data[0] if res.data else None


def find_db_duplicate_by_title(title: str, threshold: float = 0.45) -> dict | None:
    """
    Use pg_trgm similarity search to detect near-duplicate notifications in DB.
    Returns the closest matching record (slug + title) or None if no match found.

    Raises on infrastructure failure instead of silently allowing duplicates
    (the silent-None behavior let duplicates accumulate for months).
    """
    res = supabase.rpc(
        "find_similar_notification",
        {"search_title": title, "threshold": threshold}
    ).execute()
    if res.data:
        return res.data[0]  # {id, slug, title, sim_score}
    return None


def _log_run(total: int, new_c: int, updated_c: int,
             new_entries: list, updated_entries: list,
             status: str = "completed", error_message: str | None = None) -> None:
    """Insert a row to scraper_runs. Prints the actual error on failure (never silent)."""
    row: dict = {
        "scraper_type": "jobs",
        "total_synced": total,
        "new_count": new_c,
        "updated_count": updated_c,
        "new_entries": new_entries,
        "updated_entries": updated_entries,
        "status": status,
    }
    if error_message is not None:
        row["error_message"] = error_message
    try:
        supabase.table("scraper_runs").insert(row).execute()
        print(f"📋 Run logged: {new_c} new, {updated_c} updated (status={status}).")
    except Exception as e:
        print(f"⚠️  scraper_runs INSERT FAILED: {e}")
        safe = {k: v for k, v in row.items() if k not in ("new_entries", "updated_entries")}
        print(f"    Payload (sans entries): {json.dumps(safe)}")


def upsert_notifications(notifications, max_new: int = 0):
    """
    Inserts or updates notifications in the database.
    - max_new > 0: stop adding NEW entries once this many have been collected
      (updates to existing entries are not capped).
    - New entries are checked for pg_trgm near-duplicates before insert.
      If a near-duplicate is found, the entry is merged into the existing record
      (using that record's slug) instead of creating a new slug.
    - Existing entries are smart-merged (never loses data, only gains).
    - The scraper log records the actual field-level changes made.
    """
    if not notifications:
        _log_run(0, 0, 0, [], [], "completed")
        return

    # Hard requirement: no dedup infrastructure, no writes.
    verify_dedup_ready()

    # Deduplicate locally by slug
    unique_notifications: dict = {}
    for n in notifications:
        target_key = n.get("slug")
        if not target_key:
            continue
        n["updated_at"] = datetime.utcnow().isoformat()
        n["entity_key"] = compute_entity_key(n.get("title", ""))
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

    # Slugs already queued in final_list this run — a batch upsert cannot
    # write the same row twice ("ON CONFLICT ... cannot affect row a second time").
    pending_slugs: set = set()

    for n in deduped_list:
        slug = n["slug"]
        if slug not in existing_by_slug:
            # Tier A: exact entity-key match (lifecycle variant of same recruitment)
            # Tier B: pg_trgm title similarity
            similar = find_db_duplicate_by_entity_key(n.get("entity_key", ""))
            if similar:
                print(f"  🔀 entity_key: '{n['title'][:60]}' is a lifecycle variant of '{similar['title'][:60]}'")
            else:
                similar = find_db_duplicate_by_title(n.get("title", ""))
            if similar:
                if similar["slug"] not in existing_by_slug:
                    # Fetch the actual near-duplicate record for merging
                    try:
                        dup_res = supabase.table("notifications").select(
                            "slug, title, link, ai_summary, exam_date, deadline, details"
                        ).eq("slug", similar["slug"]).single().execute()
                        if dup_res.data:
                            existing_by_slug[similar["slug"]] = dup_res.data
                    except Exception:
                        pass
                # Merge even when the target row was already cached (e.g. another
                # entry in this batch mapped to it) — previously such entries were
                # inserted as new and crashed on the unique_notification constraint.
                if similar["slug"] in existing_by_slug:
                    print(f"  🔀 pg_trgm: '{n['title'][:60]}' → merging into '{similar['title'][:60]}' (sim={similar.get('sim_score', 0):.2f})")
                    n["slug"] = similar["slug"]
                    slug = similar["slug"]

        if slug not in existing_by_slug:
            # Still looks new — check for an exact (title, source) match, which
            # the unique_notification constraint would reject on insert.
            try:
                exact_res = supabase.table("notifications").select(
                    "slug, title, link, ai_summary, exam_date, deadline, details"
                ).eq("title", n.get("title", "")).eq(
                    "source", n.get("source", "")
                ).limit(1).execute()
                if exact_res.data:
                    row = exact_res.data[0]
                    existing_by_slug[row["slug"]] = row
                    print(f"  🔁 Exact title+source already in DB → merging into slug '{row['slug']}'")
                    n["slug"] = row["slug"]
                    slug = row["slug"]
            except Exception:
                pass

        if slug in pending_slugs:
            skipped_count += 1
            print(f"  ⏭️  Duplicate within batch (row already queued): {n.get('title', slug)}")
            continue

        if slug not in existing_by_slug:
            # Genuinely new notification — insert as-is (honour max_new cap)
            if max_new > 0 and len(new_entries) >= max_new:
                print(f"  🎯 Reached target of {max_new} new entries — skipping remaining.")
                skipped_count += 1
                continue
            final_list.append(n)
            pending_slugs.add(slug)
            new_entries.append({"title": n["title"], "slug": slug, "link": n.get("link", "")})
        else:
            # Existing notification — smart merge
            old = existing_by_slug[slug]
            merged = smart_merge(old, n)
            changes = compute_diff(old, merged)

            if changes:
                final_list.append(merged)
                pending_slugs.add(slug)
                updated_entries.append({"title": merged["title"], "slug": slug, "changes": changes})
                print(f"  ✏️  Updated ({len(changes)} changes): {merged['title']}")
            else:
                # Smart merge produced no actual changes — skip the DB write
                skipped_count += 1
                print(f"  ✓  No changes: {n.get('title', slug)}")

    if not final_list:
        print(f"ℹ️  Nothing to write ({skipped_count} entries already up to date).")
        _log_run(len(deduped_list), 0, 0, [], [])
        return []

    try:
        print(f"Syncing {len(final_list)} notifications to Supabase "
              f"({len(new_entries)} new, {len(updated_entries)} updated, {skipped_count} unchanged)...")
        response = supabase.table("notifications").upsert(
            final_list,
            on_conflict="slug"
        ).execute()
        print("✅ Successfully synced to database.")

        _log_run(len(deduped_list), len(new_entries), len(updated_entries),
                 new_entries, updated_entries)

        return response.data

    except Exception as e:
        err_text = str(e)
        if "23505" not in err_text and "duplicate key" not in err_text:
            _log_run(0, 0, 0, [], [], status="failed", error_message=err_text[:500])
            print(f"❌ Error upserting to DB: {e}")
            raise e

        # Duplicate-key on the batch: retry row by row so one conflicting
        # entry can't discard the whole run's work.
        print(f"⚠️  Batch upsert hit duplicate key — retrying row by row: {e}")
        synced = []
        failed_titles = []
        for row in final_list:
            try:
                r = supabase.table("notifications").upsert(row, on_conflict="slug").execute()
                synced.extend(r.data or [])
            except Exception as row_e:
                failed_titles.append(str(row.get("title", row.get("slug", "?")))[:80])
                print(f"  ❌ Skipped '{str(row.get('title', '?'))[:70]}': {row_e}")

        print(f"✅ Row-by-row sync done: {len(synced)} written, {len(failed_titles)} skipped.")
        _log_run(
            len(deduped_list), len(new_entries), len(updated_entries),
            new_entries, updated_entries,
            status="completed" if not failed_titles else "partial",
            error_message=(
                f"{len(failed_titles)} rows skipped (duplicate key): "
                + "; ".join(failed_titles)
            )[:500] if failed_titles else None,
        )
        return synced



if __name__ == "__main__":
    print("Testing DB connection...")

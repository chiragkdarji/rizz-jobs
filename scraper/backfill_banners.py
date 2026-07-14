"""
Backfill notification banners for entries missing visuals.notification_image.

Banners stopped generating on 2026-05-23 when Google zeroed the free-tier
quota for Gemini image models. This regenerates them with the template-based
generator (image_gen.py), which renders the site's /api/og exam card.

Run:  python backfill_banners.py                 # all missing banners
      python backfill_banners.py --batch 10      # first 10 only
      python backfill_banners.py --all           # regenerate every active notification
      python backfill_banners.py --dry-run       # list what would be done

Set OG_BASE_URL=http://localhost:3000 to render against a local `npm start`
build instead of production (useful before the new template is deployed).
"""

import argparse
import sys
import time

from image_gen import generate_banner, supabase


def run(batch_size: int, regenerate_all: bool, dry_run: bool) -> None:
    # Paginate: PostgREST caps unranged selects at 1000 rows
    rows = []
    page_size = 1000
    offset = 0
    while True:
        result = (
            supabase.table("notifications")
            .select("id, title, slug, ai_summary, deadline, details, visuals")
            .eq("is_active", True)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        page = result.data or []
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

    targets = []
    for row in rows:
        visuals = row.get("visuals") or {}
        has_banner = isinstance(visuals, dict) and bool(visuals.get("notification_image"))
        if regenerate_all or not has_banner:
            targets.append(row)

    if batch_size:
        targets = targets[:batch_size]

    print(f"Active notifications: {len(rows)} | to process: {len(targets)} "
          f"(all={regenerate_all}, dry_run={dry_run})\n")

    ok = fail = 0
    for i, row in enumerate(targets, 1):
        title = row["title"]
        print(f"[{i}/{len(targets)}] {title[:70]}")
        if dry_run:
            continue

        visuals = row.get("visuals") or {}
        if not isinstance(visuals, dict):
            visuals = {}
        details = row.get("details") or {}
        categories = details.get("categories") or [] if isinstance(details, dict) else []

        banner_url = generate_banner(
            title,
            row.get("ai_summary", ""),
            old_image_url=visuals.get("notification_image"),
            slug=row.get("slug") or row["id"],
            deadline=row.get("deadline"),
            category=categories[0] if categories else None,
        )
        if not banner_url:
            fail += 1
            continue

        visuals["notification_image"] = banner_url
        metadata = visuals.setdefault("metadata", {})
        if not isinstance(metadata, dict):
            metadata = visuals["metadata"] = {}
        metadata.update({
            "alt": f"{title} - Official Job Notification",
            "title": title,
            "caption": f"Official notification for {title}",
            "description": f"Job notification image for the {title} recruitment update.",
        })

        try:
            supabase.table("notifications").update({"visuals": visuals}).eq("id", row["id"]).execute()
            ok += 1
        except Exception as e:
            print(f"  ❌ DB update failed: {e}")
            fail += 1

        time.sleep(0.2)

    print(f"\n{'-' * 50}")
    print(f"Done -- ok={ok}  fail={fail}  targeted={len(targets)}")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=0, help="Max notifications to process (0 = all)")
    parser.add_argument("--all", action="store_true", help="Regenerate all banners, not just missing ones")
    parser.add_argument("--dry-run", action="store_true", help="List targets without generating")
    args = parser.parse_args()
    run(args.batch, args.all, args.dry_run)

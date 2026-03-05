import asyncio
import argparse
import json
import re
from engine import fetch_page_content
from parser import clean_html, parse_notifications, parse_exam_details
from db import upsert_notifications
from image_gen import generate_banner

def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from a title."""
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)  # Remove special chars
    slug = re.sub(r'[\s]+', '-', slug)          # Spaces to hyphens
    slug = re.sub(r'-+', '-', slug)             # Collapse multiple hyphens
    slug = slug.strip('-')                       # Trim leading/trailing hyphens
    return slug[:120]                            # Cap length for URLs

# Seed URLs for the PoC (Industry standard aggregators for highest reliability)
SOURCES = [
    {"name": "FreeJobAlert", "url": "https://www.freejobalert.com/latest-notifications/"},
    {"name": "SarkariExam", "url": "https://www.sarkariexam.com/"}, 
    {"name": "JagranJosh", "url": "https://www.jagranjosh.com/articles/government-jobs-exam-notifications-updates-1330335198-1"},
    {"name": "SarkariResult", "url": "https://www.sarkariresult.com/latestjob/"}
]

async def run_automation(dry_run=False):
    """
    Main loop to check all sources, parse them, synthesized, and sync to DB.
    """
    print("🚀 Starting Government Exam Automation...")
    
    # 1. Discovery Phase: Collect all candidate notifications from all sources
    all_discovery = []
    for source in SOURCES:
        print(f"\n--- Checking {source['name']} ---")
        result = await fetch_page_content(source["url"])
        if result["status"] == "error":
            print(f"❌ Error fetching {source['name']}: {result.get('error')}")
            continue
        
        print(f"✅ Fetched {len(result['html'])} bytes from {source['name']}.")
        cleaned_text = clean_html(result["html"])
        notifications = parse_notifications(cleaned_text, source["name"])
        
        for n in notifications:
            n["discovered_on"] = source["name"]
            all_discovery.append(n)
            
    if not all_discovery:
        print("⚠️ No notifications found across all sources.")
        return

    # 2. Consolidation Phase: Group by Title to synthesize a single "Truth"
    # Filter out old notifications (2024 and earlier)
    CURRENT_YEAR = 2026
    MIN_YEAR = CURRENT_YEAR - 1  # Allow 2025 and 2026
    
    consolidated = {}
    for n in all_discovery:
        title = n.get("title", "").strip()
        if not title: continue
        
        # Skip old entries: if title contains a year older than MIN_YEAR, skip it
        years_in_title = re.findall(r'20\d{2}', title)
        if years_in_title:
            newest_year = max(int(y) for y in years_in_title)
            if newest_year < MIN_YEAR:
                print(f"  ⏭️ Skipping old entry: {title} (year: {newest_year})")
                continue
        
        if title not in consolidated:
            consolidated[title] = {
                "title": title,
                "discovery_links": [n.get("link")],
                "exam_date": n.get("exam_date"),
                "deadline": n.get("deadline"),
                "ai_summary": n.get("ai_summary"),
                "sources": [n["discovered_on"]]
            }
        else:
            # Add new links and sources if not already there
            if n.get("link") not in consolidated[title]["discovery_links"]:
                consolidated[title]["discovery_links"].append(n.get("link"))
            if n["discovered_on"] not in consolidated[title]["sources"]:
                consolidated[title]["sources"].append(n["discovered_on"])

    print(f"\n🔍 Found {len(consolidated)} unique exam titles. Starting Deep Synthesis...")

    # 3. AI Research & Synthesis Phase (Zero-Shot Mode)
    # We no longer visit aggregator detail pages. We use the Title + AI knowledge.
    final_list = []
    for title, data in consolidated.items():
        print(f"\n📖 AI Researching: {title}")
        
        # Call the Professional Researcher AI
        # Pass discovered links so AI can pick the best deep link
        discovered_links = data.get("discovery_links", [])
        deep_data = parse_exam_details(title, data.get("ai_summary", ""), discovered_links)
        
        official_link = deep_data.get("official_link")
        best_details = deep_data.get("details", {})

        # Validation: Prefer deep gov links over homepage or aggregator links
        if not official_link or not official_link.startswith("http") or any(agg in official_link.lower() for agg in ["sarkari", "freejobalert", "jagranjosh", "testbook"]):
            # Try to find a gov deep link from discovered URLs
            gov_deep_links = [l for l in discovered_links if l and any(ext in l.lower() for ext in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])]
            if gov_deep_links:
                official_link = gov_deep_links[0]
            else:
                official_link = f"https://www.google.com/search?q={title.replace(' ', '+')}+official+notification+apply"

        # Prepare final object
        entry = {
            "title": title,
            "slug": generate_slug(title),
            "link": official_link,
            "exam_date": data["exam_date"],
            "deadline": data["deadline"],
            "ai_summary": data["ai_summary"],
            "details": best_details,
            "seo": deep_data.get("seo", {}),
            "visuals": deep_data.get("visuals", {}),
            "screenshot_b64": None,
            "source": "Official Notification"
        }

        # Generate AI banner image
        banner_url = generate_banner(title, data.get("ai_summary", ""))
        if banner_url:
            entry["visuals"]["notification_image"] = banner_url
            if "metadata" not in entry["visuals"]:
                entry["visuals"]["metadata"] = {}
            entry["visuals"]["metadata"]["alt"] = f"{title} - Official Job Notification Banner"
            entry["visuals"]["metadata"]["title"] = title
            entry["visuals"]["metadata"]["caption"] = f"Official notification banner for {title}"
            entry["visuals"]["metadata"]["description"] = f"Professional job notification banner for the {title} recruitment update."

        final_list.append(entry)

    # 4. Sync to Database
    if dry_run:
        print("\nDRY RUN: Skip sync to DB.")
        print(json.dumps(final_list, indent=2))
    else:
        upsert_notifications(final_list)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Government Exam Automated Scraper")
    parser.add_argument("--dry-run", action="store_true", help="Run without saving to DB")
    args = parser.parse_args()
    
    asyncio.run(run_automation(dry_run=args.dry_run))

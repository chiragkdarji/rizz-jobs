import asyncio
import argparse
import json
from engine import fetch_page_content
from parser import clean_html, parse_notifications, parse_exam_details
from db import upsert_notifications

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
    # We use a normalized title for better grouping
    consolidated = {}
    for n in all_discovery:
        title = n.get("title", "").strip()
        if not title: continue
        
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
        # It uses the title and the primary ai_summary from discovery
        deep_data = parse_exam_details(title, data.get("ai_summary", ""))
        
        official_link = deep_data.get("official_link")
        best_details = deep_data.get("details", {})

        # Validation: If AI failed to provide a link, fallback to a Google search for the official site
        if not official_link or not official_link.startswith("http") or any(agg in official_link.lower() for agg in ["sarkari", "freejobalert", "jagranjosh"]):
            official_link = f"https://www.google.com/search?q={title.replace(' ', '+')}+official+portal"

        # Prepare final object
        entry = {
            "title": title,
            "link": official_link,
            "exam_date": data["exam_date"],
            "deadline": data["deadline"],
            "ai_summary": data["ai_summary"],
            "details": best_details,
            "screenshot_b64": None, # Non-essential for AI-only mode
            "source": "Official Notification" # Fixed source for unique constraint (title, source)
        }
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

import asyncio
import argparse
from engine import fetch_page_content
from parser import clean_html, parse_notifications
from db import upsert_notifications

# Seed URLs for the PoC (Industry standard aggregators for highest reliability)
SOURCES = [
    {"name": "FreeJobAlert", "url": "https://www.freejobalert.com/latest-notifications/"},
    {"name": "SarkariExam", "url": "https://www.sarkariexam.com/"}, 
]

async def run_automation(dry_run=False):
    """
    Main loop to check all sources, parse them, and sync to DB.
    """
    print("🚀 Starting Government Exam Automation...")
    
    for source in SOURCES:
        print(f"\n--- Checking {source['name']} ---")
        
        # 1. Fetch Content
        result = await fetch_page_content(source["url"])
        if result["status"] == "error":
            print(f"❌ Error fetching {source['name']}: {result.get('error')}")
            continue
        
        print(f"✅ Fetched {len(result['html'])} bytes of HTML.")
        
        # 2. Clean and Parse with AI
        cleaned_text = clean_html(result["html"])
        print(f"🔍 Parsing {len(cleaned_text)} chars with AI (GPT-4o-mini)...")
        
        notifications = parse_notifications(cleaned_text, source["name"])
        
        if not notifications:
            print(f"⚠️ No new notifications extracted for {source['name']}.")
            continue
        
        print(f"Found {len(notifications)} candidate updates. Deep scraping details...")
        
        final_list = []
        for n in notifications:
            detail_link = n.get("link")
            if not detail_link or not detail_link.startswith("http"):
                detail_link = source["url"]
            
            # Deep Scrape the individual page
            detail_res = await fetch_page_content(detail_link, capture_img=True)
            if detail_res["status"] == "success":
                # Clean and re-parse the individual detail page for high-fidelity data
                detail_text = clean_html(detail_res["html"])
                deep_parsed = parse_notifications(detail_text, f"{source['name']} Detail")
                
                if deep_parsed and len(deep_parsed) > 0:
                    # Enrich the original notification with deep details
                    main_data = deep_parsed[0] # Take the top result from detail page
                    n["details"] = main_data.get("details")
                    n["screenshot_b64"] = detail_res.get("screenshot")
                    n["source"] = source["name"]
                    final_list.append(n)
            else:
                # Fallback if detail page fails
                n["source"] = source["name"]
                final_list.append(n)
        
        # 3. Sync to Database
        if dry_run:
            import json
            print("DRY RUN: Skip sync to DB.")
            print(json.dumps(final_list, indent=2))
        else:
            upsert_notifications(final_list)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Government Exam Automated Scraper")
    parser.add_argument("--dry-run", action="store_true", help="Run without saving to DB")
    args = parser.parse_args()
    
    asyncio.run(run_automation(dry_run=args.dry_run))

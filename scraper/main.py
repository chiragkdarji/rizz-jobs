import asyncio
import argparse
from engine import fetch_page_content
from parser import clean_html, parse_notifications
from db import upsert_notifications

# Seed URLs for the PoC
SOURCES = [
    {"name": "UPSC", "url": "https://upsc.gov.in/whats-new"},
    {"name": "SSC", "url": "https://ssc.nic.in/"}, # Note: SSC often blocks, might need ZenRows later
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
            print(f"Skipping {source['name']} due to fetch error.")
            continue
        
        # 2. Clean and Parse with AI
        cleaned_text = clean_html(result["html"])
        print(f"Parsing {len(cleaned_text)} chars with AI...")
        
        notifications = parse_notifications(cleaned_text, source["name"])
        
        if not notifications:
            print(f"No new notifications found for {source['name']}.")
            continue
        
        print(f"Found {len(notifications)} updates.")
        
        # Add source field to each notification
        for n in notifications:
            n["source"] = source["name"]
        
        # 3. Sync to Database
        if dry_run:
            import json
            print("DRY RUN: Skip sync to DB.")
            print(json.dumps(notifications, indent=2))
        else:
            upsert_notifications(notifications)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Government Exam Automated Scraper")
    parser.add_argument("--dry-run", action="store_true", help="Run without saving to DB")
    args = parser.parse_args()
    
    asyncio.run(run_automation(dry_run=args.dry_run))

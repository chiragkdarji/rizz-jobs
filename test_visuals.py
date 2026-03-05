
import asyncio
import json
import sys
import os

# Add current directory to path so it can find scraper module
sys.path.append(os.getcwd())

from scraper.parser import parse_exam_details

async def test_vis_synthesis():
    titles = [
        "UPSC Civil Services 2026",
        "GSSSB Clerk Recruitment",
        "SSC CGL 2026 notification"
    ]
    
    for title in titles:
        print(f"\n--- Testing Visuals for: {title} ---")
        result = parse_exam_details(title, "Official recruitment update for 2026")
        print(json.dumps(result.get("visuals", {}), indent=2))
        print(f"Official Link found: {result.get('official_link')}")

if __name__ == "__main__":
    asyncio.run(test_vis_synthesis())

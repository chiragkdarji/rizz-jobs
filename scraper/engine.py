import asyncio
from playwright.async_api import async_playwright

async def fetch_page_content(url: str, capture_img=False):
    """
    Fetches the HTML content and optionally a screenshot.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Re-using the same context for both content and screenshot if needed
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()
        
        try:
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(5) # Give it time to render tables
            
            content = await page.content()
            title = await page.title()
            
            screenshot_b64 = None
            if capture_img:
                import base64
                print(f"Capturing screenshot for {url}...")
                screenshot_bytes = await page.screenshot(full_page=False)
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            return {
                "url": url,
                "title": title,
                "html": content,
                "screenshot": screenshot_b64,
                "status": "success"
            }
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return {"url": url, "status": "error", "error": str(e)}
        finally:
            await browser.close()

if __name__ == "__main__":
    # Test with UPSC
    test_url = "https://upsc.gov.in/whats-new"
    result = asyncio.run(fetch_page_content(test_url))
    print(f"Fetched {result['title']} (Length: {len(result['html'])})")

import asyncio
from playwright.async_api import async_playwright

async def fetch_page_content(url: str):
    """
    Fetches the HTML content of a given URL using Playwright.
    Handles basic navigation and waiting for network idle.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            
            # Simple antibot-bypass: scroll a bit
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
            await asyncio.sleep(2)
            
            content = await page.content()
            title = await page.title()
            
            return {
                "url": url,
                "title": title,
                "html": content,
                "status": "success"
            }
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return {
                "url": url,
                "status": "error",
                "error": str(e)
            }
        finally:
            await browser.close()

if __name__ == "__main__":
    # Test with UPSC
    test_url = "https://upsc.gov.in/whats-new"
    result = asyncio.run(fetch_page_content(test_url))
    print(f"Fetched {result['title']} (Length: {len(result['html'])})")

import asyncio
from urllib.parse import urlparse, parse_qs, unquote
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import requests as req_sync


# ─── URL Validation ──────────────────────────────────────────────────────────

def validate_url(url: str, timeout: int = 6) -> bool:
    """
    Returns True if the URL responds with a non-error HTTP status (<400).
    Tries HEAD first (fast); falls back to a streaming GET for servers that
    reject HEAD (405/403/501).
    """
    if not url:
        return False
    if not url.startswith("http"):
        return False
    if "google.com/search" in url or "example.com" in url:
        return False

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
    }
    try:
        r = req_sync.head(url, headers=headers, timeout=timeout, allow_redirects=True)
        if r.status_code < 400:
            return True
        if r.status_code in (403, 405, 501):
            # Server does not support HEAD — use lightweight GET
            r = req_sync.get(
                url, headers=headers, timeout=timeout,
                allow_redirects=True, stream=True
            )
            r.close()
            return r.status_code < 400
        return False
    except Exception:
        try:
            r = req_sync.get(
                url, headers=headers, timeout=timeout,
                allow_redirects=True, stream=True
            )
            r.close()
            return r.status_code < 400
        except Exception:
            return False


def extract_domain(url: str) -> str:
    """Extract the netloc from a URL, e.g. 'https://upsc.gov.in/path' → 'upsc.gov.in'."""
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


# ─── DuckDuckGo URL Search ────────────────────────────────────────────────────

GOV_TLDS = [".gov.in", ".nic.in", ".edu.in", ".ac.in"]


def search_official_url(title: str, hint_domain: str = None) -> str | None:
    """
    Searches DuckDuckGo (HTML endpoint) for the official notification page.

    Strategy:
      1. Domain-specific search if hint_domain is a gov.in / nic.in domain.
      2. General search for the title + site:gov.in.
      3. Broad search without site restriction.

    Returns the first validated gov.in / nic.in URL found, or None.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://duckduckgo.com/",
    }

    queries = []
    if hint_domain and any(d in hint_domain for d in [".gov.in", ".nic.in"]):
        queries.append(f"site:{hint_domain} recruitment notification 2025 OR 2026")
    queries.append(f'"{title}" official notification site:gov.in OR site:nic.in')
    queries.append(f"{title} recruitment 2026 official apply online notification")

    for query in queries:
        try:
            resp = req_sync.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers=headers,
                timeout=12,
            )
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            for a in soup.find_all("a", class_="result__a"):
                href = a.get("href", "")

                # DuckDuckGo wraps result URLs — extract from uddg param
                actual_url = href
                if "uddg=" in href:
                    qs = parse_qs(href.split("?", 1)[1] if "?" in href else "")
                    actual_url = unquote(qs.get("uddg", [""])[0])

                if not actual_url or not actual_url.startswith("http"):
                    continue
                if not any(d in actual_url for d in GOV_TLDS):
                    continue

                if validate_url(actual_url, timeout=6):
                    print(f"    🔍 DuckDuckGo found valid URL: {actual_url}")
                    return actual_url

        except Exception as e:
            print(f"    ⚠️  DuckDuckGo search error: {e}")
            continue

    return None


# ─── Page Fetcher ─────────────────────────────────────────────────────────────

async def fetch_page_content(url: str, capture_img: bool = False) -> dict:
    """
    Fetches the HTML content of a URL using a headless Chromium browser.
    Optionally captures a full-page screenshot (base64-encoded PNG).
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        try:
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(4)  # Allow JS-rendered content to settle

            content = await page.content()
            title = await page.title()

            screenshot_b64 = None
            if capture_img:
                import base64
                screenshot_bytes = await page.screenshot(full_page=False)
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

            return {
                "url": url,
                "title": title,
                "html": content,
                "screenshot": screenshot_b64,
                "status": "success",
            }
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return {"url": url, "status": "error", "error": str(e)}
        finally:
            await browser.close()


if __name__ == "__main__":
    test_url = "https://upsc.gov.in/whats-new"
    result = asyncio.run(fetch_page_content(test_url))
    print(f"Fetched '{result.get('title')}' ({len(result.get('html', ''))} bytes)")

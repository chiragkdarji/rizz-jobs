import os
import json
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ─── HTML Cleaning ────────────────────────────────────────────────────────────

def clean_html(html_content: str) -> str:
    """
    Cleans raw HTML for AI consumption and performs "Link Elevation":
    moves verified government URLs to the very top of the text so the
    AI researcher sees them first and uses them as the primary source.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # Strip structural/non-content elements
    for tag in soup(["script", "style", "nav", "footer", "iframe",
                     "header", "aside", "form", "svg", "img"]):
        tag.decompose()

    verified_gov_links = []

    # Pre-pass: collect all government domain links for elevation
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        is_gov = any(ext in href.lower() for ext in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])
        if is_gov:
            label = a.get_text(strip=True)
            verified_gov_links.append(
                f"🚨🚨🚨 VERIFIED_GOVERNMENT_PORTAL: {href} (Label: {label}) 🚨🚨🚨"
            )

    # Remove large unrelated lists (sidebars, "more jobs" sections, etc.)
    for list_tag in soup.find_all(["ul", "ol"]):
        if len(list_tag.find_all("li")) > 5:
            list_tag.decompose()

    # Annotate remaining links with their type
    unique_links: set = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith("http") or "javascript" in href or href in unique_links:
            continue
        unique_links.add(href)

        text = a.get_text(separator=" ", strip=True)
        is_gov = any(ext in href.lower() for ext in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])
        is_agg = any(
            agg in href.lower()
            for agg in ["sarkari", "freejobalert", "jagranjosh", "testbook"]
        )

        if is_gov:
            a.string = f"\n🚨 (OFFICIAL_GOV_URL: {href}) [Text: {text}] 🚨\n"
        elif is_agg:
            a.string = "(Internal Backup Link)"
        elif any(kw in href.lower() for kw in ["apply", "official", "notification", "portal", "recruit"]):
            a.string = f"\n⭐ (POTENTIAL_OFFICIAL_URL: {href}) [Text: {text}] ⭐\n"
        else:
            a.string = f"[{text}] (URL: {href})"

    main_text = soup.get_text(separator="\n | \n", strip=True)
    elevated_header = "\n".join(verified_gov_links)
    combined = (
        f"ELEVATED VERIFIED GOV PORTALS (PREFER THESE AS official_link):\n"
        f"{elevated_header}\n\nPAGE CONTENT:\n{main_text}"
    )
    return combined[:80000]


# ─── PDF Link Extraction ──────────────────────────────────────────────────────

def extract_pdf_links(html_content: str, base_url: str = "") -> list:
    """
    Extracts PDF download links from a scraped page.
    Returns a list of dicts: {url, filename, document_type, link_text}.
    Capped at 10 PDFs per page.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    pdf_links = []
    seen_urls: set = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href:
            continue
        if not href.startswith("http") and base_url:
            href = urljoin(base_url, href)
        elif not href.startswith("http"):
            continue

        if ".pdf" not in href.lower() or href in seen_urls:
            continue
        seen_urls.add(href)

        text = a.get_text(strip=True).lower()
        filename = urlparse(href).path.split("/")[-1] or "document.pdf"
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"

        document_type = "official_notification"
        if any(kw in text for kw in ["admit", "hall ticket", "call letter", "e-admit"]):
            document_type = "admit_card"
        elif any(kw in text for kw in ["result", "merit list", "score card", "cut off"]):
            document_type = "result"
        elif any(kw in text for kw in ["syllabus", "curriculum", "exam pattern"]):
            document_type = "syllabus"
        elif any(kw in text for kw in ["answer key", "answer sheet", "provisional answer"]):
            document_type = "answer_key"

        pdf_links.append({
            "url": href,
            "filename": filename,
            "document_type": document_type,
            "link_text": a.get_text(strip=True)[:100],
        })

        if len(pdf_links) >= 10:
            break

    return pdf_links


# ─── Discovery Phase: Extract Notification List ───────────────────────────────

def parse_notifications(raw_text: str, source_name: str) -> list:
    """
    Uses GPT-4o-mini to extract a list of notification summaries from an
    aggregator's main page HTML (already cleaned by clean_html).
    """
    prompt = f"""
You are an expert at extracting government exam notifications from web content.
Target Source: {source_name}

Extract all NEW exam/recruitment notifications found in the text.
Return a JSON object with a single key "notifications" containing an array.

CRITICAL URL RULE: For each "link", extract the URL from markers like:
  (OFFICIAL_GOV_URL: ...) → highest priority, use this
  (POTENTIAL_OFFICIAL_URL: ...) → use if no gov URL found
  (URL: ...) → last resort
Never invent URLs. If no URL is found for a notification, set link to null.

Each notification object must have:
  - title: Precise full name of the exam/recruitment
  - link: Best URL found (null if none)
  - exam_date: YYYY-MM-DD format, or null
  - deadline: Application deadline as YYYY-MM-DD, or null
  - ai_summary: One punchy sentence summarising what this notification is about

Text content:
---
{raw_text}
---
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("notifications", [])
    except Exception as e:
        print(f"Error parsing notifications for {source_name}: {e}")
        return []


# ─── Deep Research Phase: Synthesise Full Exam Data ──────────────────────────

_DEEP_RESEARCH_TEMPLATE = """
You are a senior Government Exam Research Analyst for India.
Exam / Recruitment Title: @TITLE@
Discovery Snippet: @SNIPPET@

@LINKS_CONTEXT@

═══════════════════════════════════════════════════════
TASK 1 — OFFICIAL LINK  (most important)
═══════════════════════════════════════════════════════
Priority order for choosing official_link:
  1. A DISCOVERED LINK above that points to a .gov.in or .nic.in DEEP PAGE
     (path contains /recruitment/, /notification/, /career/, /vacancy/, /advt/, /apply/, /result/, etc.)
  2. A DISCOVERED LINK to the organisation's .gov.in / .nic.in HOMEPAGE
  3. A URL you know with HIGH CONFIDENCE exists right now (only if you are certain — never guess paths)
  4. The organisation's homepage (e.g. https://upsc.gov.in) — SAFE FALLBACK

⚠️  HOMEPAGE IS BETTER THAN A WRONG DEEP LINK.
    If you are not 100% certain a specific deep-path URL exists, return the homepage.
    A working homepage saves the user; a 404 deep link wastes their time.

NEVER return aggregator links (sarkari*, freejobalert, jagranjosh, testbook, naukri, etc.).
NEVER invent a URL path you are not certain about.

Set official_link_confidence to:
  "high"  → URL comes from discovered links, OR you are certain it works today
  "low"   → URL constructed from general knowledge; may need validation

═══════════════════════════════════════════════════════
TASK 2 — STRUCTURED DATA  (fill every field you know)
═══════════════════════════════════════════════════════
Return the most accurate data you can find. Use "To be announced" only as a
true last resort — never for fields you actually know.

  exam_date      : YYYY-MM-DD (the main examination date), or null
  deadline       : YYYY-MM-DD (last date to apply online), or null
  ai_summary     : One punchy sentence — what is this notification, how many vacancies, who can apply?
  direct_answer  : JSON array of 3-6 key bullet facts (vacancies count, deadline, eligibility, salary, etc.)

  details:
    what_is_the_update : 3-4 professional sentences explaining the latest status
    categories         : array of 1-3 names from: @CATEGORIES_LIST@
    age_limit          : age eligibility as a plain string (e.g. "18-27 years, relaxation as per rules")
    important_dates    : dict — all relevant dates as YYYY-MM-DD values
    vacancies          : total count + post-wise breakdown as a string or structured text
    eligibility        : educational qualifications + other criteria
    selection_process  : array of stages in order
    application_fee    : fee by category (General/OBC/SC/ST) as a string
    how_to_apply       : numbered step-by-step instructions
    faqs               : array of 6-10 {"q":"...","a":"..."} objects covering common candidate questions
                         (eligibility, fee, age limit, salary, application process, correction window,
                          document list, syllabus, result expected date, etc.)

═══════════════════════════════════════════════════════
TASK 3 — SEO
═══════════════════════════════════════════════════════
  meta_title       : ≤60 chars, keyword-rich
  meta_description : ≤160 chars, compelling
  meta_keywords    : 6-10 comma-separated keywords
  json_ld          : Schema.org JobPosting or GovernmentService JSON-LD object

═══════════════════════════════════════════════════════
TASK 4 — VISUALS  (metadata only, no image URLs)
═══════════════════════════════════════════════════════
  body_logo          : null  (never guess logo URLs)
  notification_image : null  (generated separately)
  metadata: alt, title, caption, description  — professional text, NO words like "AI", "generated", "banner"

═══════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════
Return a single flat JSON object:
{
  "official_link": "...",
  "official_link_confidence": "high|low",
  "exam_date": "YYYY-MM-DD or null",
  "deadline": "YYYY-MM-DD or null",
  "ai_summary": "...",
  "direct_answer": ["...", "..."],
  "details": {
    "what_is_the_update": "...",
    "categories": ["..."],
    "age_limit": "...",
    "important_dates": {},
    "vacancies": "...",
    "eligibility": "...",
    "selection_process": ["..."],
    "application_fee": "...",
    "how_to_apply": "...",
    "faqs": [{"q": "...", "a": "..."}]
  },
  "seo": {
    "meta_title": "...",
    "meta_description": "...",
    "meta_keywords": "...",
    "json_ld": {}
  },
  "visuals": {
    "body_logo": null,
    "notification_image": null,
    "metadata": {"alt": "...", "title": "...", "caption": "...", "description": "..."}
  }
}
"""


def parse_exam_details(
    title: str,
    discovery_snippet: str,
    discovered_links: list = None,
    categories: list = None,
) -> dict:
    """
    Deep-research an exam/recruitment using GPT-4o.
    Returns a fully structured dict with official_link, dates, details, seo, visuals.

    Key improvements over previous version:
    - Returns exam_date, deadline, ai_summary at top level (not just inside details)
    - Returns official_link_confidence to guide URL validation in main.py
    - Prompt instructs AI to prefer homepage over a guessed 404 deep path
    - age_limit moved to details AND exposed at top of details for easy access
    """
    print(f"  🔬 Deep-researching: {title}")

    links_context = ""
    if discovered_links:
        valid = [l for l in discovered_links if l and l.startswith("http")]
        if valid:
            links_context = (
                "DISCOVERED LINKS FROM SCRAPED PAGES (check these first for official_link):\n"
                + "\n".join(f"  - {l}" for l in valid)
            )

    if categories:
        category_names = [c["name"] for c in categories if c.get("name")]
    else:
        category_names = [
            "10th / 12th Pass", "Banking", "Railway", "Defense / Police",
            "UPSC / SSC", "Teaching", "Engineering", "Medical", "PSU", "State Jobs", "Other",
        ]

    prompt = (
        _DEEP_RESEARCH_TEMPLATE
        .replace("@TITLE@", title)
        .replace("@SNIPPET@", discovery_snippet or "")
        .replace("@LINKS_CONTEXT@", links_context)
        .replace("@CATEGORIES_LIST@", json.dumps(category_names))
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  ❌ Error deep-researching {title}: {e}")
        return {}

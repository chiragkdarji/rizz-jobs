import os
import json
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def clean_html(html_content: str) -> str:
    """
    Cleans HTML and performs 'Link Elevation' for the AI Researcher.
    Moves critical government links to the VERY TOP of the text.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove extreme clutter that distracts AI
    for tag in soup(["script", "style", "nav", "footer", "iframe", "header", "aside", "form", "svg", "img"]):
        tag.decompose()
    
    verified_gov_links = []
    
    # Pre-pass: Find high-value government links specifically
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        is_gov = any(ext in href.lower() for ext in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])
        if is_gov:
            label = a.get_text(strip=True)
            verified_gov_links.append(f"🚨🚨🚨 VERIFIED_GOVERNMENT_PORTAL: {href} (Label: {label}) 🚨🚨🚨")

    # Deep Cleaning: Remove "Related Jobs" lists that overwhelm the context
    for list_tag in soup.find_all(["ul", "ol"]):
        if len(list_tag.find_all("li")) > 5:
            # Likely a sidebar or related jobs footer
            list_tag.decompose()

    # Link Preservation for all other links
    unique_links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith("http") or "javascript" in href or href in unique_links:
            continue
        unique_links.add(href)
            
        text = a.get_text(separator=" ", strip=True)
        is_gov = any(ext in href.lower() for ext in [".gov.in", ".nic.in", ".ac.in", ".edu.in"])
        is_agg = any(agg in href.lower() for agg in ["sarkari", "freejobalert", "jagranjosh", "testbook"])
        
        if is_gov:
            a.string = f"\n🚨 (OFFICIAL_GOV_URL: {href}) [Text: {text}] 🚨\n"
        elif is_agg:
            # Obfuscate these from being chosen as primary official link
            a.string = f"(Internal Backup Link)"
        elif any(kw in href.lower() for kw in ["apply", "official", "notification", "portal"]):
            a.string = f"\n⭐ (POTENTIAL_OFFICIAL_URL: {href}) [Text: {text}] ⭐\n"
        else:
            a.string = f"[{text}] (URL: {href})"

    # Final text assembly: Elevate critical links to the top
    main_text = soup.get_text(separator="\n | \n", strip=True)
    elevated_header = "\n".join(verified_gov_links)
    combined = f"ELEVATED VERIFIED GOV PORTALS (PREFER THESE):\n{elevated_header}\n\nPAGE CONTENT:\n{main_text}"
    
    return combined[:80000]

def extract_pdf_links(html_content: str, base_url: str = "") -> list:
    """
    Extracts PDF download links from a scraped page.
    Returns a list of dicts: {url, filename, document_type, link_text}
    Caps at 10 PDFs per page to avoid runaway downloads.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    pdf_links = []
    seen_urls = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href:
            continue

        # Resolve relative URLs
        if not href.startswith("http"):
            if base_url:
                href = urljoin(base_url, href)
            else:
                continue

        if ".pdf" not in href.lower():
            continue

        if href in seen_urls:
            continue
        seen_urls.add(href)

        text = a.get_text(strip=True).lower()
        filename = urlparse(href).path.split("/")[-1] or "document.pdf"
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"

        # Classify document type from link text
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


def parse_notifications(raw_text: str, source_name: str):
    """
    Extracts high-level notification updates from an aggregator's main page.
    """
    prompt = f"""
    You are an expert at extracting government exam notifications from web content.
    Target Source: {source_name}
    
    Extract all NEW exam notifications found in the text. 
    Return a JSON object with a key "notifications".
    
    CRITICAL: For each "link", you MUST extract the URL from (OFFICIAL_URL: ...), (POTENTIAL_OFFICIAL_URL: ...), or (DETAIL_URL: ...).
    
    Each object must have:
    - title: Precise name of the exam
    - link: The most direct detail page URL found.
    - exam_date: YYYY-MM-DD or null
    - deadline: YYYY-MM-DD or null
    - ai_summary: A 1-sentence punchy summary.
    
    Text content:
    ---
    {raw_text}
    ---
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("notifications", [])
    except Exception as e:
        print(f"Error parsing notifications for {source_name}: {e}")
        return []

def parse_exam_details(title: str, discovery_snippet: str, discovered_links: list = None):
    """
    Acts as a Professional Government Exam Researcher.
    Uses zero-shot knowledge + discovered links to synthesize official info.
    """
    print(f"DEBUG: Starting Bulletproof Research for {title}")
    
    # Build a links context block for the AI
    links_context = ""
    if discovered_links:
        valid_links = [l for l in discovered_links if l and l.startswith("http")]
        if valid_links:
            links_context = "DISCOVERED LINKS FROM SCRAPED PAGES (USE THESE):\n" + "\n".join(f"  - {l}" for l in valid_links)
    
    template = """
    You are an expert Government Exam Researcher in India.
    Exam Title: @TITLE@
    Source Snippet: @SNIPPET@
    
    @LINKS_CONTEXT@
    
    TASK 1: IDENTIFY THE OFFICIAL PORTAL
    - CRITICAL: Look at the DISCOVERED LINKS above first. If any link points to a .gov.in or .nic.in DEEP PAGE 
      (not just a homepage), use that exact URL as the official_link.
    - A deep page URL contains path segments like /recruitment/, /notification/, /career/, /vacancy/, /advt/, /apply/ etc.
    - Example of a GOOD deep link: https://upsc.gov.in/examinations/civil-services-2026
    - Example of a BAD homepage link: https://upsc.gov.in (DO NOT use these unless no deep link exists)
    - If no deep link exists in discovered links, use your knowledge to find the EXACT notification page URL.
    - NEVER return aggregator links (sarkari*, freejobalert, jagranjosh, testbook, etc).
    
    TASK 2: SYNTHESIZE RICH CONTENT (ChatGPT Style)
    - what_is_the_update: 3-4 professional sentences explaining the latest status.
    - direct_answer: A JSON array of 3-5 key highlights as bullet points (e.g., ["17,727 vacancies", "Deadline: April 30", "Graduate eligible"]). These are critical facts applicants need immediately.
    - categories: Extract an array of 1-3 applicable categories from this exact list: ["10th / 12th Pass", "Banking", "Railway", "Defense / Police", "UPSC / SSC", "Teaching", "Engineering", "Medical", "PSU", "State Jobs", "Other"].
    - important_dates: Dictionary of application dates, exam dates, etc.
    - application_fee: Provide the fee structure.
    - vacancies: Detail the posts and numbers.
    - eligibility: Educational and age requirements.
    - selection_process: Bulleted steps.
    - how_to_apply: Step-by-step instructions.
    
    TASK 3: SEO & VISUAL DATA
    - meta_title: A high-ranking SEO title (max 60 chars).
    - meta_description: A compelling meta description (max 160 chars).
    - meta_keywords: 5-8 relevant keywords as a comma-separated string.
    - json_ld: A professional Schema.org JSON-LD object (JobPosting or GovernmentService type).
    
    VISUAL RULES (CRITICAL):
    - body_logo: Set to null. Do NOT guess logo URLs. We will handle logos separately.
    - notification_image: Set to null. Do NOT guess image URLs.
    - metadata: Provide alt, title, caption, description text based on the exam title. 
      - STRICT RULE: Do NOT use words like 'AI', 'Generated', or 'Banner'.
      - Use professional terms like 'Official notification', 'Image', or 'Information'.
    
    Return as a single JSON object. If you are unsure of specific dates for 2026, use "To be announced".
    
    Expected JSON Structure:
    {
      "official_link": "... (MUST be a deep page URL, not a homepage) ...",
      "direct_answer": ["...", "...", "..."],
      "details": {
        "what_is_the_update": "...",
        "categories": ["..."],
        "important_dates": {},
        ...
      },
      "seo": {
        "meta_title": "...",
        "meta_description": "...",
        "meta_keywords": "...",
        "json_ld": { ... }
      },
      "visuals": {
        "body_logo": null,
        "notification_image": null,
        "metadata": { "alt": "...", "title": "...", "caption": "...", "description": "..." }
      }
    }
    """
    
    prompt = template.replace("@TITLE@", title).replace("@SNIPPET@", discovery_snippet).replace("@LINKS_CONTEXT@", links_context)
    
    try:
        # Use gpt-4o for maximum reasoning quality on official links
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error researching {title}: {e}")
        return {}

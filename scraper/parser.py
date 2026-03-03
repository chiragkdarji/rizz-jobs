import os
import json
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

def parse_exam_details(raw_text: str, exam_title: str):
    """
    Acts as a Deep Research Agent to synthesize a comprehensive guide.
    """
    prompt = f"""
    You are an expert Government Exam Researcher. Analyze the text for: "{exam_title}".
    
    TASK 1: FIND TRUE OFFICIAL LINK
    - Look at the section "ELEVATED VERIFIED GOV PORTALS" first. If a link matches this exam (e.g. upsssc.gov.in for UPSSSC), use it.
    - Also search for markers: "🚨 (OFFICIAL_URL: [URL]) 🚨".
    - PREFER .gov.in, .nic.in, or .ac.in domains.
    - STRICT RULE: NEVER return a link containing 'sarkari', 'freejobalert', 'jagranjosh', or 'sarkariresult' as the "official_link". Use NULL if you only see aggregators.
    
    TASK 2: HIGH-FIDELITY SYNTHESIS (ChatGPT Style)
    Create a professional guide:
    - what_is_the_update: 3-4 detailed sentences explaining exactly what happened (Results out, Form open, etc).
    - important_dates: Dictionary of dates.
    - application_fee: Details.
    - age_limit: Rules.
    - vacancies: Numbers.
    - eligibility: Criteria.
    - selection_process: Simple bullets.
    - how_to_apply: Step-by-step.
    
    Return as JSON.
    
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
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error parsing deep details for {exam_title}: {e}")
        return {}

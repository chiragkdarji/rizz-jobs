import os
import json
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def clean_html(html_content: str) -> str:
    """
    Cleans HTML and preserves links in an AI-friendly format.
    Prioritizes 'Important Links' sections where official .gov.in links reside.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove extreme clutter
    for tag in soup(["script", "style", "nav", "footer", "iframe", "header", "aside", "form"]):
        tag.decompose()
    
    # We look for "Important Links" sections to ensure we find the bottom table
    content_area = soup.find("div", {"class": ["content", "entry-content", "post-content"]}) or soup.body
    
    # Link Preservation with 'Needle-in-Haystack' highlighting
    unique_links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith("http") or "javascript" in href or href in unique_links:
            continue
        unique_links.add(href)
            
        text = a.get_text(separator=" ", strip=True)
        is_gov = any(ext in href.lower() for ext in [".gov.in", ".nic.in", ".ac.in"])
        
        # We give these absolute priority for the AI researcher
        if is_gov:
            a.string = f"\n🔥🔥🔥 CRITICAL_OFFICIAL_GOV_LINK: {href} [TEXT: {text}] 🔥🔥🔥\n"
        elif any(kw in href.lower() for kw in ["official-website", "apply-online", "download-notification"]):
            a.string = f"\n⭐⭐⭐ HIGH_PRIORITY_ACTION_LINK: {href} [TEXT: {text}] ⭐⭐⭐\n"
        elif any(agg in href.lower() for agg in ["sarkariexam", "freejobalert", "sarkariresult"]):
            # Mask these to keep AI focused on government sites
            a.string = f"[Aggregator Link: {text}]"
        else:
            a.string = f"[Other Link: {text}] (URL: {href})"

    # Get text with vertical separation
    text = soup.get_text(separator="\n | \n", strip=True)
    return text[:80000] # Full context for GPT-4o-mini

def parse_notifications(raw_text: str, source_name: str):
    """
    Extracts high-level notification updates from an aggregator's main page.
    """
    prompt = f"""
    You are an expert at extracting government exam notifications from web content.
    Target Source: {source_name}
    
    Extract all NEW exam notifications found in the text. 
    Return a JSON object with a key "notifications".
    
    CRITICAL: For each "link", you MUST extract the (DETAIL_URL: ...) value that follows the job title. 
    DO NOT return the aggregator's home page (like https://www.freejobalert.com).
    
    Each object must have:
    - title: Precise name of the exam
    - link: The SPECIFIC (DETAIL_URL: ...) or (OFFICIAL_URL: ...) for this entry.
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
    
    TASK 1: FIND OFFICIAL LINK
    - Search specifically for markers: "🔥🔥🔥 CRITICAL_OFFICIAL_GOV_LINK: [URL] 🔥🔥🔥".
    - If multiple exist, pick the one that matches the exam name (e.g. jpsc.gov.in for Jharkhand PSC).
    - If not found, look for "⭐⭐⭐ HIGH_PRIORITY_ACTION_LINK: [URL] ⭐⭐⭐" where the URL is NOT an aggregator.
    - NEVER return aggregator site URLs (freejobalert, sarkariresult, sarkariexam, jagranjosh).
    
    TASK 2: SYNTHESIZE CONTENT
    Create a professional, high-fidelity overview (ChatGPT style):
    - what_is_the_update: 3-4 detailed sentences explaining the latest news.
    - important_dates: Dictionary of key milestones.
    - application_fee: Details on fees.
    - age_limit: Rules.
    - vacancies: Numbers and posts.
    - eligibility: Academic/Physical.
    - selection_process: Steps.
    - how_to_apply: Step-by-step instructions.
    
    Return as a single JSON object. If data is missing in the text, use null or "Detailed info TBA".
    
    Text content:
    ---
    {raw_text}
    ---
    """
    
    try:
        # Switch to gpt-4o for Deep Synthesis for "ChatGPT-style" quality
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error parsing deep details for {exam_title}: {e}")
        return {}

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
    Ensures URL info is explicitly present for discovery.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove clutter
    for script_or_style in soup(["script", "style", "nav", "footer", "iframe"]):
        script_or_style.decompose()
    
    # Link Preservation for AI
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if not href.startswith("http"):
            continue # Skip relative if necessary or assume base URL later
            
        text = a.get_text(strip=True)
        if any(kw in href.lower() for kw in [".gov.in", ".nic.in", ".ac.in", "official", "apply", "notification"]):
            a.string = f"[{text}] (OFFICIAL_URL: {href})"
        else:
            a.string = f"[{text}] (DETAIL_URL: {href})"

    # Get text with better separator
    text = soup.get_text(separator=" | ", strip=True)
    return text[:30000] # Increase limit to allow more link context

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
    
    CRITICAL: Find the ACTUAL official portal link (e.g., UPPSC.up.nic.in, jpsc.gov.in). 
    In the text, look for markers like (OFFICIAL_URL: ...) or links that contain ".gov.in" or ".nic.in".
    DO NOT return aggregator site URLs.
    
    Synthesize all available info into a clear JSON:
    - official_link: The direct government link found.
    - details: { "what_is_the_update", "important_dates", "application_fee", "age_limit", "vacancies", "eligibility", "selection_process", "how_to_apply" }
    
    Important: If no table exists, extract details from the sentences. 
    Format the values for a premium UI (use bullet points or clear descriptions).
    
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

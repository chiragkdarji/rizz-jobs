import os
import json
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def clean_html(html_content: str) -> str:
    """
    Cleans HTML by removing scripts and styles.
    We keep the body structure mostly intact for the AI.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    for script_or_style in soup(["script", "style"]):
        script_or_style.decompose()
    
    # Get text with better separator
    return soup.get_text(separator=" | ", strip=True)[:20000]

def parse_notifications(raw_text: str, source_name: str):
    """
    Extracts high-level notification updates from an aggregator's main page.
    """
    prompt = f"""
    You are an expert at extracting government exam notifications from web content.
    Target Source: {source_name}
    
    Extract all NEW exam notifications or updates found in the text below. 
    Return a JSON object with a key "notifications" containing an array of objects.
    Each object must have:
    - title: Precise name of the exam or update
    - link: ABSOLUTE URL to the detail page on this aggregator site.
    - exam_date: Targeted date of the exam (if mentioned, YYYY-MM-DD, otherwise null)
    - deadline: Application deadline (if mentioned, YYYY-MM-DD, otherwise null)
    - ai_summary: A 1-sentence punchy summary of the job/exam alert.
    
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
    Extracts deep structured details from a specific exam's detail page.
    """
    prompt = f"""
    You are an expert researcher. Extract detailed information about the following exam: "{exam_title}".
    
    Return a JSON object with:
    - official_link: The ACTUAL official government portal link for this exam (NOT the aggregator site link). Look for "Official Website" or "Apply Online" links.
    - details: A JSON object containing:
        * important_dates: A dictionary of events like "Application Start", "Last Date", etc.
        * application_fee: Details about fees for different categories.
        * age_limit: Min/Max age.
        * vacancies: Total vacancy count and post-wise breakdown.
        * eligibility: Academic/Physical requirements.
        * selection_process: The stages (e.g., CBT, Physical, Interview).
        * how_to_apply: Brief steps to apply.
    
    If any field is missing, use null.
    
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

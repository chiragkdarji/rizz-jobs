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
    Preserves <a> tags' href attributes so the AI can see official links.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove clutter
    for script_or_style in soup(["script", "style", "nav", "footer", "iframe"]):
        script_or_style.decompose()
    
    # Preserve links by appending URL to the link text
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Only preserve "interesting" links to save tokens
        if any(keyword in href.lower() for keyword in [".gov.in", ".nic.in", ".ac.in", "official", "apply", "notification"]):
            a.string = f"{a.get_text()} [URL: {href}]"
        elif not href.startswith("http") or "sarkariexam" in href or "freejobalert" in href:
            # Mask aggregator internal links to avoid AI confusion
            a.string = f"{a.get_text()} [AGGREGATOR LINK]"
        else:
            a.string = f"{a.get_text()} [URL: {href}]"

    # Get text with better separator
    text = soup.get_text(separator=" | ", strip=True)
    return text[:25000] # Increased cap slightly

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
    Acts as a Deep Research Agent to synthesize a comprehensive guide for the exam.
    """
    prompt = f"""
    You are an expert Government Exam Researcher. Your task is to extract and SYNTHESIZE a comprehensive guide for the exam: "{exam_title}".
    
    Using the provided source text, create a high-fidelity structured overview.
    
    Return a JSON object with:
    - official_link: The ACTUAL official government portal link (e.g., .gov.in, .nic.in). Search the text for "Apply Online", "Official Website", or "Notify Link".
    - details: A JSON object containing:
        * what_is_the_update: A 2-3 sentence clear explanation of what this notification actually is (e.g., Application started for 22,000 posts, Results out, Exam date changed).
        * important_dates: A dictionary of key dates (e.g., "Registration Opens", "Last Date", "Admit Card", "Exam Date").
        * application_fee: Categorized fee details (e.g., Gen/OBC: ₹100, SC/ST: Free).
        * age_limit: Clear min/max age rules and reference dates (e.g., 21-35 years as of 01/01/2026).
        * vacancies: Total count and key post-wise breakdown.
        * eligibility: Detailed educational/physical criteria (e.g., Degree in Any Stream, Height 165cm).
        * selection_process: Bulleted steps (e.g., 1. Prelims, 2. Mains, 3. Physical Test).
        * how_to_apply: Step-by-step instructions for the applicant.
    
    Critical Instruction: 
    - NEVER return the aggregator's own link (like freejobalert.com or sarkariexam.com) as the "official_link". 
    - Look for external links in the bracketed [URL: ...] tags.
    - If a field is missing, use its common knowledge/TBA or null. 
    
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

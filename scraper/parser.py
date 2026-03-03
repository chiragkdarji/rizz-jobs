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
    Uses GPT-4o-mini to extract structured exam notifications from cleaned text.
    """
    prompt = f"""
    You are an expert at extracting government exam notifications from web content.
    Target Source: {source_name}
    
    Extract all NEW exam notifications or updates found in the text below. 
    Return a JSON object with a key "notifications" containing an array of objects.
    Each object must have:
    - title: Precise name of the exam or update
    - link: URL to the official notification (if found, otherwise null)
    - exam_date: Targeted date of the exam (if mentioned, YYYY-MM-DD, otherwise null)
    - deadline: Application deadline (if mentioned, YYYY-MM-DD, otherwise null)
    - ai_summary: A 1-sentence punchy summary for SEO
    - direct_answer: A concise Q&A style block (2-3 bullet points) that answers basic questions like:
        * What is the update?
        * Who is eligible?
        * What is the key date?
        This is for AEO (Answer Engine Optimization).
    
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
        
        content = response.choices[0].message.content
        print(f"DEBUG: Raw AI Response: {content[:500]}...") # Show first 500 chars
        data = json.loads(content)
        
        # Robust extraction of the list
        notifications = []
        if isinstance(data, dict):
            # Look for common keys AI might use
            for key in ["notifications", "updates", "exams", "items"]:
                if key in data and isinstance(data[key], list):
                    notifications = data[key]
                    break
            if not notifications and len(data) == 1:
                # If there's only one key and it's a list, take it
                inner = list(data.values())[0]
                if isinstance(inner, list):
                    notifications = inner
        
        return notifications
        
    except Exception as e:
        print(f"Error parsing with AI: {e}")
        return []

if __name__ == "__main__":
    # Mock test
    mock_text = "UPSC Civil Services Prelims 2024 revised date is 16-06-2024. Apply by 05-03-2024."
    results = parse_notifications(mock_text, "UPSC")
    print(json.dumps(results, indent=2))

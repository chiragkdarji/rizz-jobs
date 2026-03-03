import os
import json
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def clean_html(html_content: str) -> str:
    """
    Cleans HTML by removing scripts, styles, and unnecessary tags to save tokens.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
        script_or_style.decompose()
    
    # Get text or a simplified version of the body
    return soup.get_text(separator="\n", strip=True)[:10000] # Cap at 10k chars for PoC

def parse_notifications(raw_text: str, source_name: str):
    """
    Uses GPT-4o-mini to extract structured exam notifications from cleaned text.
    """
    prompt = f"""
    You are an expert at extracting government exam notifications from web content.
    Target Source: {source_name}
    
    Extract all NEW exam notifications or updates found in the text below. 
    For each notification, return a JSON object with:
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
    
    Return ONLY a JSON array of objects. No additional text.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        # Handle cases where AI wraps it in a "notifications" key
        if "notifications" in data:
            return data["notifications"]
        return data if isinstance(data, list) else [data]
        
    except Exception as e:
        print(f"Error parsing with AI: {e}")
        return []

if __name__ == "__main__":
    # Mock test
    mock_text = "UPSC Civil Services Prelims 2024 revised date is 16-06-2024. Apply by 05-03-2024."
    results = parse_notifications(mock_text, "UPSC")
    print(json.dumps(results, indent=2))

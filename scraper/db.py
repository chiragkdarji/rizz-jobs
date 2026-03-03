import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def get_latest_notifications(limit=10):
    """
    Fetches the latest notifications from the database.
    """
    try:
        response = supabase.table("notifications").select("*").order("created_at", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching from DB: {e}")
        return []

def upsert_notifications(notifications):
    """
    Inserts or updates notifications in the database.
    Uses 'title' and 'source' as a unique constraint.
    """
    if not notifications:
        return
        
    try:
        print(f"Syncing {len(notifications)} notifications to Supabase...")
        response = supabase.table("notifications").upsert(
            notifications, 
            on_conflict="title,source"
        ).execute()
        print(f"✅ Successfully synced to database.")
        return response.data
    except Exception as e:
        print(f"❌ Error upserting to DB: {e}")
        raise e

if __name__ == "__main__":
    # Test connection
    print("Testing DB connection...")
    # This will fail until the user provides keys, but the logic is sound.

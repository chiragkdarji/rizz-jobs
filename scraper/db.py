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
    Deduplicates by (title, source) before batching to Supabase.
    """
    if not notifications:
        return
        
    # Deduplicate locally by (Title, Source) to match the existing DB constraint
    unique_notifications = {}
    for n in notifications:
        target_key = (n.get("title"), n.get("source"))
        if not target_key[0]: continue
        unique_notifications[target_key] = n
    
    deduped_list = list(unique_notifications.values())
    
    try:
        print(f"Syncing {len(deduped_list)} unique notifications to Supabase...")
        # Reverting to the existing database constraint (title, source)
        response = supabase.table("notifications").upsert(
            deduped_list, 
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

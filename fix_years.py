import asyncio
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

async def fix_years():
    """Fix all pages with N/A year by extracting from URL"""
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "tracker_db")
    
    client = AsyncIOMotorClient(mongodb_uri)
    database = client[database_name]
    collection = database["pages"]
    
    try:
        print("🔧 Fixing years for all pages...")
        
        # Get all pages
        pages = await collection.find({}).to_list(None)
        
        print(f"Found {len(pages)} total pages")
        
        # Debug: Show current years
        for page in pages:
            print(f"Page: {page.get('page_link', 'NO LINK')} -> Year: '{page.get('year', 'MISSING')}'")
        
        print("\n" + "="*50 + "\n")
        
        updated_count = 0
        for page in pages:
            current_year = page.get("year")
            page_link = page.get("page_link", "")
            
            # Check if year needs updating (N/A, None, empty, or different from URL)
            if page_link and (not current_year or current_year == "N/A" or current_year == ""):
                # Extract year from URL (2000-2029)
                year_match = re.search(r'(20[0-2][0-9])', page_link)
                if year_match:
                    year = year_match.group(1)
                    result = await collection.update_one(
                        {"_id": page["_id"]},
                        {"$set": {"year": year}}
                    )
                    if result.modified_count > 0:
                        updated_count += 1
                        print(f"✅ Updated page: {page_link} -> Year: {year}")
                else:
                    print(f"⚠️  No year found in URL: {page_link}")
        
        print(f"\n✅ Successfully updated {updated_count} pages!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_years())

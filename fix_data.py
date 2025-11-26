import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

async def fix_data():
    """Fix the data according to user's correct specifications"""
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "tracker_db")
    
    client = AsyncIOMotorClient(mongodb_uri)
    database = client[database_name]
    collection = database["pages"]
    
    try:
        print("🔧 Fixing data according to user specifications...")
        
        # Fix Chemistry page - should be COMPLETED (30/30)
        chemistry_result = await collection.update_one(
            {"page_link": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_chemistry/"},
            {"$set": {
                "completed_questions": 30,
                "status": "Completed"
            }}
        )
        print(f"✅ Fixed Chemistry page: {chemistry_result.modified_count} updated")
        
        # Ensure AP Stats 2015 Multiple Choice is PENDING (0/40)
        ap_stats_result = await collection.update_one(
            {"page_link": "https://www.iitianacademy.com/ap_stats_2015_multiple_choice/"},
            {"$set": {
                "completed_questions": 0,
                "status": "Pending"
            }}
        )
        print(f"✅ Fixed AP Stats 2015 Multiple Choice: {ap_stats_result.modified_count} updated")
        
        # Verify current totals
        pages = []
        async for page in collection.find({}):
            pages.append(page)
        
        total_questions = sum(page.get("total_questions", 0) for page in pages)
        completed_questions = sum(page.get("completed_questions", 0) for page in pages)
        
        print(f"\n📊 Current Data Summary:")
        print(f"Total Questions: {total_questions}")
        print(f"Completed Questions: {completed_questions}")
        print(f"Remaining Questions: {total_questions - completed_questions}")
        
        print(f"\n📋 Page Details:")
        for i, page in enumerate(pages, 1):
            print(f"{i}. {page.get('page_name', 'Unknown')}: {page.get('completed_questions', 0)}/{page.get('total_questions', 0)} - {page.get('status', 'Unknown')}")
        
        if total_questions != 480:
            print(f"\n⚠️  Total is {total_questions}, but user expects 480. Should we adjust individual page totals?")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_data())
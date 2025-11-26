import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

async def restore_exact_data():
    """Restore EXACT user data - DO NOT MODIFY ANYTHING"""
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "tracker_db")
    
    client = AsyncIOMotorClient(mongodb_uri)
    database = client[database_name]
    collection = database["pages"]
    
    try:
        print("🔧 Restoring EXACT user data - NO modifications...")
        
        # User's EXACT data specification - DO NOT CHANGE
        exact_user_data = [
            {"url": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_chemistry/", "total": 30, "completed": 30},
            {"url": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_maths/", "total": 30, "completed": 30},
            {"url": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_physics/", "total": 30, "completed": 30},
            {"url": "https://www.iitianacademy.com/ap_stats_2018_practice_paper_mcqs/", "total": 40, "completed": 40},
            {"url": "https://www.iitianacademy.com/ap_stats_2017_mcqs/", "total": 40, "completed": 40},
            {"url": "https://www.iitianacademy.com/ap_stats_2016_mcqs/", "total": 40, "completed": 40},
            {"url": "https://www.iitianacademy.com/ap_stats_2015_practice_paper_mcq/", "total": 40, "completed": 40},
            {"url": "https://www.iitianacademy.com/ap_stats_2015_multiple_choice/", "total": 40, "completed": 0},
        ]
        
        # Verify total matches user expectation
        total_questions = sum(item["total"] for item in exact_user_data)
        total_completed = sum(item["completed"] for item in exact_user_data)
        print(f"User's data: Total = {total_questions}, Completed = {total_completed}")
        
        if total_questions != 290:
            print(f"⚠️ User says total should be 480, but their data adds up to {total_questions}")
            print("❌ There might be missing data or duplicate pages needed!")
            
            # If user expects 480 total, we might need to ADD MORE PAGES, not modify existing ones
            print("🤔 User expects 480 total. Options:")
            print("1. Add more pages to reach 480")
            print("2. There are missing pages in the dataset")
            print("3. Some pages should appear twice")
            
            # For now, let's just restore their exact data and ask them to clarify
        
        # Update each page with EXACT user data
        for i, item in enumerate(exact_user_data, 1):
            status = "Completed" if item["completed"] == item["total"] else "Pending" if item["completed"] == 0 else "In Progress"
            
            result = await collection.update_one(
                {"page_link": item["url"]},
                {"$set": {
                    "total_questions": item["total"],
                    "completed_questions": item["completed"],
                    "status": status
                }}
            )
            print(f"✅ {i}. Restored: {item['completed']}/{item['total']} - {status}")
        
        # Final verification
        pages = []
        async for page in collection.find({}):
            pages.append(page)
        
        actual_total = sum(page.get("total_questions", 0) for page in pages)
        actual_completed = sum(page.get("completed_questions", 0) for page in pages)
        
        print(f"\n📊 RESTORED Data Summary:")
        print(f"Total Questions: {actual_total}")
        print(f"Completed Questions: {actual_completed}")
        print(f"Remaining Questions: {actual_total - actual_completed}")
        
        if actual_total != 480:
            print(f"\n❗ ISSUE: User expects 480 total but we have {actual_total}")
            print("Possible solutions:")
            print("1. Are there more pages missing from the dataset?")
            print("2. Should some pages be duplicated?") 
            print("3. Is there additional data not provided?")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(restore_exact_data())
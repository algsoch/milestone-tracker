import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

async def fix_milestone_ranges():
    """Fix milestone question ranges to be cumulative"""
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "tracker_db")
    
    client = AsyncIOMotorClient(mongodb_uri)
    database = client[database_name]
    milestones_collection = database["milestones"]
    
    try:
        print("🔧 Fixing milestone question ranges...")
        
        # Get all milestones sorted by creation date
        milestones = await milestones_collection.find({}).sort("created_at", 1).to_list(None)
        
        print(f"Found {len(milestones)} milestones")
        
        cumulative_start = 1
        for idx, milestone in enumerate(milestones, 1):
            milestone_questions = milestone.get("total_questions", 480)
            start_question = cumulative_start
            end_question = cumulative_start + milestone_questions - 1
            
            update_data = {
                "start_question": start_question,
                "end_question": end_question,
                "question_range": f"{start_question}-{end_question}"
            }
            
            result = await milestones_collection.update_one(
                {"_id": milestone["_id"]},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                print(f"✅ Milestone {idx}: {milestone.get('title', 'Untitled')}")
                print(f"   Questions: {start_question}-{end_question} (Total: {milestone_questions})")
                print(f"   Payment: ${milestone.get('amount', 0)} - {milestone.get('payment_status', 'Pending')}")
            
            cumulative_start = end_question + 1
        
        print(f"\n✅ Successfully updated all milestone ranges!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_milestone_ranges())

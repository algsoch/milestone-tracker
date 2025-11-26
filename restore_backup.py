#!/usr/bin/env python3
"""
Restore data from backup file to MongoDB
"""

import asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def restore_from_backup(backup_file: str):
    """Restore pages and milestones from backup file"""
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "milestone_tracker")
    
    print(f"Connecting to MongoDB: {mongodb_uri[:50]}...")
    
    client = AsyncIOMotorClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5000,
        tlsAllowInvalidCertificates=True
    )
    
    # Test connection
    await client.admin.command('ping')
    print("✅ Connected to MongoDB")
    
    database = client[database_name]
    pages_collection = database["pages"]
    milestones_collection = database["milestones"]
    
    # Read backup file
    print(f"Reading backup file: {backup_file}")
    with open(backup_file, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    pages = backup_data.get("pages", [])
    print(f"Found {len(pages)} pages in backup")
    
    # Clear existing data (optional - comment out if you want to merge)
    print("Clearing existing pages...")
    await pages_collection.delete_many({})
    
    # Restore pages
    if pages:
        # Remove _id field to let MongoDB generate new ones, or keep them for exact restore
        for page in pages:
            # Convert string dates to datetime if needed
            if isinstance(page.get("created_at"), str):
                try:
                    page["created_at"] = datetime.fromisoformat(page["created_at"].replace(" ", "T"))
                except:
                    page["created_at"] = datetime.utcnow()
            
            if isinstance(page.get("updated_at"), str):
                try:
                    page["updated_at"] = datetime.fromisoformat(page["updated_at"].replace(" ", "T"))
                except:
                    page["updated_at"] = datetime.utcnow()
            
            # Remove the old _id to generate new ones
            page.pop("_id", None)
        
        result = await pages_collection.insert_many(pages)
        print(f"✅ Restored {len(result.inserted_ids)} pages")
    
    # Check if milestones exist in backup
    milestones = backup_data.get("milestones", [])
    
    # If no milestones in backup, create a default one
    if not milestones:
        print("No milestones found in backup. Creating default milestone...")
        
        # Calculate total questions from pages
        total_questions = sum(p.get("total_questions", 0) for p in pages)
        completed_questions = sum(p.get("completed_questions", 0) for p in pages)
        
        default_milestone = {
            "title": "Milestone 1 - AP Chemistry & Physics",
            "total_questions": total_questions if total_questions > 0 else 480,
            "start_question": 1,
            "end_question": total_questions if total_questions > 0 else 480,
            "question_range": f"1-{total_questions if total_questions > 0 else 480}",
            "milestone_number": 1,
            "amount": 30,
            "deadline": "2025-12-31",
            "payment_status": "Pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await milestones_collection.delete_many({})
        result = await milestones_collection.insert_one(default_milestone)
        print(f"✅ Created default milestone with ID: {result.inserted_id}")
        print(f"   - Total Questions: {default_milestone['total_questions']}")
        print(f"   - Question Range: {default_milestone['question_range']}")
    else:
        # Restore milestones from backup
        await milestones_collection.delete_many({})
        for milestone in milestones:
            milestone.pop("_id", None)
            if isinstance(milestone.get("created_at"), str):
                try:
                    milestone["created_at"] = datetime.fromisoformat(milestone["created_at"].replace(" ", "T"))
                except:
                    milestone["created_at"] = datetime.utcnow()
        
        result = await milestones_collection.insert_many(milestones)
        print(f"✅ Restored {len(result.inserted_ids)} milestones")
    
    # Verify restoration
    pages_count = await pages_collection.count_documents({})
    milestones_count = await milestones_collection.count_documents({})
    
    print("\n" + "="*50)
    print("RESTORATION COMPLETE!")
    print("="*50)
    print(f"Pages in database: {pages_count}")
    print(f"Milestones in database: {milestones_count}")
    
    client.close()
    return True

if __name__ == "__main__":
    # Use the most recent backup file
    backup_file = "backups/tracker_backup_20251101_165522.json"
    
    if not os.path.exists(backup_file):
        print(f"❌ Backup file not found: {backup_file}")
        print("Available backup files:")
        for f in sorted(os.listdir("backups")):
            print(f"  - backups/{f}")
        exit(1)
    
    asyncio.run(restore_from_backup(backup_file))

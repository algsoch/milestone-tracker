import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
import asyncio
from app.models import PageModel, MilestoneSummary

class MockDatabaseManager:
    """In-memory mock database for testing without MongoDB"""
    
    def __init__(self):
        self.pages: List[Dict[str, Any]] = []
        self.milestones: List[Dict[str, Any]] = []
        self.id_counter = 1
        self.milestone_counter = 1
        
        # Add some sample data
        self._add_sample_data()
        self._add_sample_milestones()
    
    def _add_sample_data(self):
        """Add sample pages for demonstration"""
        sample_pages = [
            {
                "_id": "1",
                "page_name": "Mathematics Chapter 1 - Algebra",
                "page_link": "https://example.com/math-ch1",
                "total_questions": 25,
                "completed_questions": 20,
                "status": "In Progress",
                "created_at": datetime(2025, 10, 13, 10, 0, 0),
                "updated_at": datetime(2025, 10, 16, 14, 30, 0)
            },
            {
                "_id": "2", 
                "page_name": "Physics Chapter 2 - Mechanics",
                "page_link": "https://example.com/physics-ch2",
                "total_questions": 30,
                "completed_questions": 30,
                "status": "Completed",
                "created_at": datetime(2025, 10, 13, 11, 0, 0),
                "updated_at": datetime(2025, 10, 15, 16, 0, 0)
            },
            {
                "_id": "3",
                "page_name": "Chemistry Chapter 3 - Organic",
                "page_link": None,
                "total_questions": 35,
                "completed_questions": 15,
                "status": "In Progress", 
                "created_at": datetime(2025, 10, 14, 9, 0, 0),
                "updated_at": datetime(2025, 10, 16, 10, 0, 0)
            },
            {
                "_id": "4",
                "page_name": "Biology Chapter 4 - Genetics",
                "page_link": "https://example.com/bio-ch4",
                "total_questions": 40,
                "completed_questions": 0,
                "status": "Pending",
                "created_at": datetime(2025, 10, 14, 15, 0, 0),
                "updated_at": datetime(2025, 10, 14, 15, 0, 0)
            }
        ]
        self.pages = sample_pages
        self.id_counter = 5
    
    async def connect_to_mongo(self):
        """Mock connection - always succeeds"""
        print("🚀 Connected to mock in-memory database")
        return True
    
    async def close_mongo_connection(self):
        """Mock disconnection"""
        print("✅ Disconnected from mock database")
        return True
    
    async def create_page(self, page_data: dict) -> str:
        """Create a new page record"""
        page_id = str(self.id_counter)
        self.id_counter += 1
        
        page_data["_id"] = page_id
        page_data["created_at"] = datetime.utcnow()
        page_data["updated_at"] = datetime.utcnow()
        
        self.pages.append(page_data)
        print(f"✅ Created page: {page_data['page_name']} (ID: {page_id})")
        return page_id
    
    async def get_page_by_id(self, page_id: str) -> Optional[dict]:
        """Get a page by its ID"""
        for page in self.pages:
            if page["_id"] == page_id:
                return page.copy()
        return None
    
    async def get_all_pages(self) -> List[dict]:
        """Get all pages"""
        return [page.copy() for page in self.pages]
    
    async def update_page(self, page_id: str, update_data: dict) -> bool:
        """Update a page"""
        for i, page in enumerate(self.pages):
            if page["_id"] == page_id:
                self.pages[i].update(update_data)
                self.pages[i]["updated_at"] = datetime.utcnow()
                print(f"✅ Updated page: {page['page_name']}")
                return True
        return False
    
    async def delete_page(self, page_id: str) -> bool:
        """Delete a page"""
        for i, page in enumerate(self.pages):
            if page["_id"] == page_id:
                deleted_page = self.pages.pop(i)
                print(f"✅ Deleted page: {deleted_page['page_name']}")
                return True
        return False
    
    async def get_milestone_summary(self) -> dict:
        """Get milestone summary statistics"""
        total_questions = sum(page.get("total_questions", 0) for page in self.pages)
        completed_questions = sum(page.get("completed_questions", 0) for page in self.pages)
        remaining_questions = total_questions - completed_questions
        progress_percentage = (completed_questions / total_questions * 100) if total_questions > 0 else 0
        
        total_pages = len(self.pages)
        completed_pages = len([p for p in self.pages if p.get("status") == "Completed"])
        in_progress_pages = len([p for p in self.pages if p.get("status") == "In Progress"])
        pending_pages = len([p for p in self.pages if p.get("status") == "Pending"])
        
        # Calculate days remaining
        deadline = datetime.strptime(os.getenv("MILESTONE_DEADLINE", "2025-10-17"), "%Y-%m-%d")
        days_remaining = (deadline - datetime.now()).days
        
        return {
            "total_questions": total_questions,
            "completed_questions": completed_questions,
            "remaining_questions": remaining_questions,
            "progress_percentage": round(progress_percentage, 2),
            "total_pages": total_pages,
            "completed_pages": completed_pages,
            "pending_pages": pending_pages,
            "in_progress_pages": in_progress_pages,
            "deadline": os.getenv("MILESTONE_DEADLINE", "2025-10-17"),
            "created_date": os.getenv("MILESTONE_CREATED", "2025-10-13"),
            "days_remaining": days_remaining,
            "milestone_amount": int(os.getenv("MILESTONE_AMOUNT", "30"))
        }
    
    async def backup_data(self) -> str:
        """Create a backup of all data"""
        pages = await self.get_all_pages()
        backup_data = {
            "backup_timestamp": datetime.utcnow().isoformat(),
            "pages": pages,
            "summary": await self.get_milestone_summary()
        }
        
        backup_filename = f"tracker_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = os.path.join("backups", backup_filename)
        
        # Ensure backups directory exists
        os.makedirs("backups", exist_ok=True)
        
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        print(f"✅ Mock backup created: {backup_path}")
        return backup_path

    def _add_sample_milestones(self):
        """Add sample milestones for demonstration"""
        sample_milestones = [
            {
                "_id": "milestone_1",
                "milestone_number": 1,
                "name": "First Milestone - Foundation Questions",
                "total_questions": 290,
                "amount": 30.0,
                "payment_status": "Pending",
                "start_date": datetime(2025, 10, 13, 0, 0, 0),
                "deadline": datetime(2025, 10, 17, 12, 0, 0),
                "created_at": datetime(2025, 10, 13, 0, 0, 0),
                "updated_at": datetime(2025, 10, 13, 0, 0, 0)
            }
        ]
        self.milestones = sample_milestones

    # Milestone Management Methods
    async def create_milestone(self, milestone_data: dict) -> str:
        """Create a new milestone"""
        milestone_id = f"milestone_{self.milestone_counter}"
        milestone_data["_id"] = milestone_id
        milestone_data["milestone_number"] = self.milestone_counter
        milestone_data["created_at"] = datetime.utcnow()
        milestone_data["updated_at"] = datetime.utcnow()
        
        self.milestones.append(milestone_data)
        self.milestone_counter += 1
        
        print(f"✅ Mock milestone created: {milestone_id}")
        return milestone_id

    async def get_all_milestones(self) -> List[dict]:
        """Get all milestones sorted by milestone number"""
        return sorted(self.milestones, key=lambda x: x["milestone_number"])

    async def get_milestone_by_id(self, milestone_id: str) -> Optional[dict]:
        """Get a milestone by its ID"""
        for milestone in self.milestones:
            if milestone["_id"] == milestone_id:
                return milestone.copy()
        return None

    async def update_milestone(self, milestone_id: str, update_data: dict) -> bool:
        """Update a milestone"""
        for i, milestone in enumerate(self.milestones):
            if milestone["_id"] == milestone_id:
                update_data["updated_at"] = datetime.utcnow()
                self.milestones[i].update(update_data)
                print(f"✅ Mock milestone updated: {milestone_id}")
                return True
        return False

    async def delete_milestone(self, milestone_id: str) -> bool:
        """Delete a milestone by its ID"""
        for i, milestone in enumerate(self.milestones):
            if milestone["_id"] == milestone_id:
                del self.milestones[i]
                print(f"✅ Mock milestone deleted: {milestone_id}")
                return True
        return False

    async def get_current_milestone(self) -> Optional[dict]:
        """Get the current active milestone"""
        # Return the first milestone that's not completed
        for milestone in sorted(self.milestones, key=lambda x: x["milestone_number"]):
            if milestone["payment_status"] in ["Pending", "Paid"]:
                return milestone.copy()
        return None

# Create mock database manager
mock_db_manager = MockDatabaseManager()
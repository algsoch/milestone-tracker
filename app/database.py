import os
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
import logging
from typing import List, Optional
from bson import ObjectId

from app.models import PageModel, MilestoneSummary, ReminderResponse, MilestoneModel, MilestoneCreate, MilestoneUpdate, PaymentStatusEnum

logger = logging.getLogger(__name__)

# Flag to track if we're using mock database
USE_MOCK_DB = False

class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None
        self.collection = None
    
    async def connect_to_mongo(self):
        """Create database connection or fall back to mock"""
        global USE_MOCK_DB
        
        mongodb_uri = os.getenv("MONGODB_URI")
        
        # If no MongoDB URI, use mock database
        if not mongodb_uri or mongodb_uri == "mock":
            logger.info("🚀 Using mock in-memory database (no MONGODB_URI provided)")
            USE_MOCK_DB = True
            from app.mock_database import mock_db_manager
            self.mock_db = mock_db_manager
            await self.mock_db.connect_to_mongo()
            return
        
        try:
            database_name = os.getenv("DATABASE_NAME", "tracker_db")
            
            self.client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=5000)
            
            # Test connection with shorter timeout
            await self.client.admin.command('ping')
            logger.info("✅ Successfully connected to MongoDB Atlas")
            
            self.database = self.client[database_name]
            self.collection = self.database["pages"]
            
            # Create indexes for better performance
            await self.collection.create_index("page_name")
            await self.collection.create_index("status")
            await self.collection.create_index("created_at")
            
        except (ServerSelectionTimeoutError, Exception) as e:
            logger.warning(f"MongoDB connection failed: {e}")
            logger.info("🔄 Falling back to mock in-memory database")
            USE_MOCK_DB = True
            from .mock_database import mock_db_manager
            self.mock_db = mock_db_manager
            await self.mock_db.connect_to_mongo()
    
    async def close_mongo_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def create_page(self, page_data: dict) -> str:
        """Create a new page record"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.create_page(page_data)
            
            page_data["created_at"] = datetime.utcnow()
            page_data["updated_at"] = datetime.utcnow()
            
            result = await self.collection.insert_one(page_data)
            logger.info(f"Created page with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating page: {e}")
            raise
    
    async def get_page_by_id(self, page_id: str) -> Optional[dict]:
        """Get a page by its ID"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_page_by_id(page_id)
            
            if not ObjectId.is_valid(page_id):
                return None
            
            page = await self.collection.find_one({"_id": ObjectId(page_id)})
            if page:
                page["_id"] = str(page["_id"])
            return page
        except Exception as e:
            logger.error(f"Error getting page by ID {page_id}: {e}")
            return None
    
    async def get_all_pages(self) -> List[dict]:
        """Get all pages"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_all_pages()
            
            cursor = self.collection.find({}).sort("created_at", -1)
            pages = []
            async for page in cursor:
                page["_id"] = str(page["_id"])
                pages.append(page)
            return pages
        except Exception as e:
            logger.error(f"Error getting all pages: {e}")
            return []
    
    async def update_page(self, page_id: str, update_data: dict) -> bool:
        """Update a page"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.update_page(page_id, update_data)
            
            if not ObjectId.is_valid(page_id):
                return False
            
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(page_id)},
                {"$set": update_data}
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"Updated page {page_id}")
            return success
        except Exception as e:
            logger.error(f"Error updating page {page_id}: {e}")
            return False
    
    async def delete_page(self, page_id: str) -> bool:
        """Delete a page"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.delete_page(page_id)
            
            if not ObjectId.is_valid(page_id):
                return False
            
            result = await self.collection.delete_one({"_id": ObjectId(page_id)})
            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted page {page_id}")
            return success
        except Exception as e:
            logger.error(f"Error deleting page {page_id}: {e}")
            return False
    
    async def get_milestone_summary(self) -> dict:
        """Get milestone summary statistics"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_milestone_summary()
            
            pages = await self.get_all_pages()
            milestones = await self.get_all_milestones()
            
            # Calculate total completed questions across all pages
            completed_questions = 0
            for page in pages:
                page_completed = page.get("completed_questions", 0)
                
                # If status is Completed but completed_questions is 0, assume all questions are completed
                if page.get("status") == "Completed" and page_completed == 0:
                    page_completed = page.get("total_questions", 0)
                
                completed_questions += page_completed
            
            # Find the current active milestone based on completed questions
            current_milestone = None
            previous_milestone = None
            current_milestone_index = -1
            
            sorted_milestones = sorted(milestones, key=lambda m: m.get("start_question", 0))
            
            for idx, milestone in enumerate(sorted_milestones):
                start_q = milestone.get("start_question", 0)
                end_q = milestone.get("end_question", 0)
                
                # If completed questions are within this milestone range, it's current
                if start_q <= completed_questions < end_q:
                    current_milestone = milestone
                    current_milestone_index = idx
                    # Get previous milestone if exists
                    if idx > 0:
                        previous_milestone = sorted_milestones[idx - 1]
                    break
                # If completed questions equal or exceed end, check if this is the last milestone
                elif completed_questions >= end_q:
                    # This might be the last completed milestone, keep checking
                    previous_milestone = milestone  # Keep track of last completed
                    continue
            
            # If no current milestone found (all completed or beyond), use the last milestone
            if not current_milestone and milestones:
                current_milestone = sorted_milestones[-1]
                current_milestone_index = len(sorted_milestones) - 1
                if len(sorted_milestones) > 1:
                    previous_milestone = sorted_milestones[-2]
            
            # If still no milestone, fall back to defaults
            if not current_milestone:
                PROJECT_TOTAL_QUESTIONS = 480
                allocated_questions = sum(page.get("total_questions", 0) for page in pages)
            else:
                # Use current milestone data
                PROJECT_TOTAL_QUESTIONS = current_milestone.get("end_question", 480)
                allocated_questions = current_milestone.get("end_question", 480)
            
            # Calculate progress for current milestone
            milestone_start = current_milestone.get("start_question", 1) if current_milestone else 1
            milestone_end = current_milestone.get("end_question", 480) if current_milestone else 480
            milestone_total = milestone_end - milestone_start + 1
            milestone_completed = max(0, completed_questions - milestone_start + 1)
            milestone_completed = min(milestone_completed, milestone_total)  # Cap at milestone total
            
            remaining_questions = milestone_total - milestone_completed
            progress_percentage = (milestone_completed / milestone_total * 100) if milestone_total > 0 else 0
            
            # Calculate overall progress across all milestones
            total_all_milestones = sum(m.get("total_questions", 0) for m in milestones)
            overall_progress = (completed_questions / total_all_milestones * 100) if total_all_milestones > 0 else 0
            
            total_pages = len(pages)
            completed_pages = len([p for p in pages if p.get("status") == "Completed"])
            in_progress_pages = len([p for p in pages if p.get("status") == "In Progress"])
            pending_pages = len([p for p in pages if p.get("status") == "Pending"])
            
            # Calculate days remaining until deadline
            deadline_str = current_milestone.get("deadline") if current_milestone else os.getenv("MILESTONE_DEADLINE", "2025-10-17")
            if isinstance(deadline_str, str):
                deadline_date = datetime.strptime(deadline_str.split('T')[0], "%Y-%m-%d")
            else:
                deadline_date = deadline_str
            
            deadline_datetime = deadline_date.replace(hour=12, minute=0, second=0, microsecond=0)
            now = datetime.now()
            time_remaining = deadline_datetime - now
            
            days_remaining = time_remaining.total_seconds() / (24 * 3600)
            days_remaining = max(0, int(days_remaining)) if days_remaining > 1 else max(0, round(days_remaining, 1))
            
            # Prepare previous milestone data
            previous_milestone_data = {}
            if previous_milestone:
                prev_start = previous_milestone.get("start_question", 1)
                prev_end = previous_milestone.get("end_question", 0)
                prev_total = prev_end - prev_start + 1
                prev_completed = min(prev_total, max(0, completed_questions - prev_start + 1))
                prev_completed = prev_total if completed_questions >= prev_end else prev_completed
                
                previous_milestone_data = {
                    "previous_milestone_exists": True,
                    "previous_milestone_title": previous_milestone.get("title", "Previous Milestone"),
                    "previous_milestone_start": prev_start,
                    "previous_milestone_end": prev_end,
                    "previous_milestone_total": prev_total,
                    "previous_milestone_completed": prev_completed,
                    "previous_milestone_progress": round((prev_completed / prev_total * 100) if prev_total > 0 else 0, 2),
                    "previous_milestone_amount": previous_milestone.get("amount", 0),
                    "previous_milestone_payment_status": previous_milestone.get("payment_status", "Pending"),
                    "previous_milestone_deadline": previous_milestone.get("deadline", ""),
                }
            else:
                previous_milestone_data = {
                    "previous_milestone_exists": False
                }
            
            return {
                "total_questions": milestone_total,
                "allocated_questions": milestone_total,
                "unallocated_questions": 0,
                "completed_questions": milestone_completed,
                "remaining_questions": remaining_questions,
                "remaining_allocated": remaining_questions,
                "progress_percentage": round(progress_percentage, 2),
                "allocated_progress_percentage": round(progress_percentage, 2),
                "overall_completed": completed_questions,
                "overall_total": total_all_milestones,
                "overall_progress_percentage": round(overall_progress, 2),
                "current_milestone_start": milestone_start,
                "current_milestone_end": milestone_end,
                "current_milestone_title": current_milestone.get("title", "Milestone 1") if current_milestone else "Milestone 1",
                "total_pages": total_pages,
                "completed_pages": completed_pages,
                "pending_pages": pending_pages,
                "in_progress_pages": in_progress_pages,
                "deadline": deadline_str,
                "created_date": current_milestone.get("created_at", os.getenv("MILESTONE_CREATED", "2025-10-13")) if current_milestone else os.getenv("MILESTONE_CREATED", "2025-10-13"),
                "days_remaining": days_remaining,
                "milestone_amount": current_milestone.get("amount", int(os.getenv("MILESTONE_AMOUNT", "30"))) if current_milestone else int(os.getenv("MILESTONE_AMOUNT", "30")),
                "milestone_number": next((i+1 for i, m in enumerate(sorted(milestones, key=lambda x: x.get("start_question", 0))) if m == current_milestone), 1),
                "payment_status": current_milestone.get("payment_status", os.getenv("PAYMENT_STATUS", "Pending")) if current_milestone else os.getenv("PAYMENT_STATUS", "Pending"),
                "freelancer_project": os.getenv("FREELANCER_PROJECT", "IITian Academy Question Bank"),
                **previous_milestone_data  # Add all previous milestone data
            }
        except Exception as e:
            logger.error(f"Error getting milestone summary: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error getting milestone summary: {e}")
            return {}
    
    async def backup_data(self) -> str:
        """Create a backup of all data"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.backup_data()
            
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
            
            logger.info(f"Backup created: {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            raise

    # Milestone Management Methods
    async def create_milestone(self, milestone_data: dict) -> str:
        """Create a new milestone"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.create_milestone(milestone_data)
            
            milestones_collection = self.database["milestones"]
            
            # Get the next milestone number
            latest_milestone = await milestones_collection.find_one(
                {}, sort=[("milestone_number", -1)]
            )
            next_number = (latest_milestone["milestone_number"] + 1) if latest_milestone else 1
            
            milestone_data["milestone_number"] = next_number
            milestone_data["created_at"] = datetime.utcnow()
            milestone_data["updated_at"] = datetime.utcnow()
            
            result = await milestones_collection.insert_one(milestone_data)
            logger.info(f"Created milestone with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating milestone: {e}")
            raise

    async def get_all_milestones(self) -> List[dict]:
        """Get all milestones sorted by milestone number with progress calculation"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_all_milestones()
            
            milestones_collection = self.database["milestones"]
            cursor = milestones_collection.find({}).sort("created_at", 1)
            milestones = []
            
            # Get all pages for progress calculation
            all_pages = await self.get_all_pages()
            
            # Calculate cumulative questions from all pages in order
            pages_sorted = sorted(all_pages, key=lambda x: x.get("created_at", datetime.min))
            cumulative_questions = 0
            page_question_mapping = []
            
            for page in pages_sorted:
                page_total = page.get("total_questions", 0)
                page_completed = page.get("completed_questions", 0)
                page_question_mapping.append({
                    "page_id": page.get("_id"),
                    "start": cumulative_questions + 1,
                    "end": cumulative_questions + page_total,
                    "total": page_total,
                    "completed": page_completed
                })
                cumulative_questions += page_total
            
            async for milestone in cursor:
                milestone["_id"] = str(milestone["_id"])
                
                # Get milestone question range
                start_q = milestone.get("start_question", 1)
                end_q = milestone.get("end_question", 480)
                
                # Calculate progress based on pages that fall within this milestone's range
                milestone_completed = 0
                milestone_total = end_q - start_q + 1
                
                for page_map in page_question_mapping:
                    # Check if page overlaps with milestone range
                    if page_map["end"] >= start_q and page_map["start"] <= end_q:
                        # Calculate how many questions from this page belong to this milestone
                        overlap_start = max(page_map["start"], start_q)
                        overlap_end = min(page_map["end"], end_q)
                        overlap_total = overlap_end - overlap_start + 1
                        
                        # Calculate completed questions in this overlap
                        page_completion_rate = page_map["completed"] / page_map["total"] if page_map["total"] > 0 else 0
                        overlap_completed = overlap_total * page_completion_rate
                        
                        milestone_completed += overlap_completed
                
                # Add progress fields
                milestone["completed_questions"] = int(milestone_completed)
                milestone["total_questions"] = milestone_total
                milestone["progress_percentage"] = round((milestone_completed / milestone_total * 100) if milestone_total > 0 else 0, 2)
                milestone["question_range_start"] = start_q
                milestone["question_range_end"] = end_q
                milestone["question_range"] = f"{start_q}-{end_q}"
                
                milestones.append(milestone)
            
            return milestones
        except Exception as e:
            logger.error(f"Error getting milestones: {e}")
            return []

    async def get_milestone_by_id(self, milestone_id: str) -> Optional[dict]:
        """Get a milestone by its ID"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_milestone_by_id(milestone_id)
            
            if not ObjectId.is_valid(milestone_id):
                return None
            
            milestones_collection = self.database["milestones"]
            milestone = await milestones_collection.find_one({"_id": ObjectId(milestone_id)})
            if milestone:
                milestone["_id"] = str(milestone["_id"])
            return milestone
        except Exception as e:
            logger.error(f"Error getting milestone by ID {milestone_id}: {e}")
            return None

    async def update_milestone(self, milestone_id: str, update_data: dict) -> bool:
        """Update a milestone"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.update_milestone(milestone_id, update_data)
            
            if not ObjectId.is_valid(milestone_id):
                return False
            
            milestones_collection = self.database["milestones"]
            update_data["updated_at"] = datetime.utcnow()
            
            result = await milestones_collection.update_one(
                {"_id": ObjectId(milestone_id)},
                {"$set": update_data}
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"Updated milestone {milestone_id}")
            return success
        except Exception as e:
            logger.error(f"Error updating milestone {milestone_id}: {e}")
            return False

    async def update_payment_status(self, milestone_id: str, payment_status: PaymentStatusEnum) -> bool:
        """Update the payment status of a milestone"""
        try:
            return await self.update_milestone(milestone_id, {"payment_status": payment_status.value})
        except Exception as e:
            logger.error(f"Error updating payment status for milestone {milestone_id}: {e}")
            return False

    async def delete_milestone(self, milestone_id: str) -> bool:
        """Delete a milestone by its ID"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.delete_milestone(milestone_id)
            
            if not ObjectId.is_valid(milestone_id):
                return False
            
            milestones_collection = self.database["milestones"]
            result = await milestones_collection.delete_one({"_id": ObjectId(milestone_id)})
            
            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted milestone {milestone_id}")
            return success
        except Exception as e:
            logger.error(f"Error deleting milestone {milestone_id}: {e}")
            return False

    async def get_current_milestone(self) -> Optional[dict]:
        """Get the current active milestone"""
        try:
            if USE_MOCK_DB:
                return await self.mock_db.get_current_milestone()
            
            milestones_collection = self.database["milestones"]
            # Get the latest milestone that's not completed (has pending/in-progress payment)
            current_milestone = await milestones_collection.find_one(
                {"payment_status": {"$in": ["Pending", "Paid"]}},
                sort=[("milestone_number", 1)]
            )
            
            if current_milestone:
                current_milestone["_id"] = str(current_milestone["_id"])
            
            return current_milestone
        except Exception as e:
            logger.error(f"Error getting current milestone: {e}")
            return None

# Global database manager instance
db_manager = DatabaseManager()
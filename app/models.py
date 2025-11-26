from pydantic import BaseModel, Field, HttpUrl, computed_field
from typing import Optional, List, Annotated
from datetime import datetime
from enum import Enum
from bson import ObjectId
import re

class StatusEnum(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"

class PaymentStatusEnum(str, Enum):
    PENDING = "Pending"
    PAID = "Paid"
    FREE = "Free"
    CANCELLED = "Cancelled"
    REFUNDED = "Refunded"

class MilestoneModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    title: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., ge=0)
    question_range_start: int = Field(..., ge=1)
    question_range_end: int = Field(..., ge=1)
    payment_status: PaymentStatusEnum = Field(default=PaymentStatusEnum.PENDING)
    deadline: datetime = Field(...)
    description: Optional[str] = Field(None, max_length=500)
    progress_percentage: Optional[float] = Field(default=0.0, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    total_questions: int = Field(..., ge=1)  # How many questions this milestone covers
    amount: float = Field(..., ge=0)
    payment_status: PaymentStatusEnum = Field(default=PaymentStatusEnum.PENDING)
    deadline: datetime = Field(...)

class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    total_questions: Optional[int] = Field(None, ge=1)
    amount: Optional[float] = Field(None, ge=0)
    payment_status: Optional[PaymentStatusEnum] = None
    deadline: Optional[datetime] = None

class PageModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    page_name: str = Field(..., min_length=1, max_length=200)
    page_link: Optional[HttpUrl] = None
    total_questions: int = Field(..., ge=0)
    completed_questions: int = Field(default=0, ge=0)
    status: StatusEnum = Field(default=StatusEnum.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @computed_field
    @property
    def remaining_questions(self) -> int:
        return max(0, self.total_questions - self.completed_questions)
    
    @computed_field
    @property
    def progress_percentage(self) -> float:
        if self.total_questions == 0:
            return 0.0
        return round((self.completed_questions / self.total_questions) * 100, 2)
    
    @computed_field
    @property
    def subject(self) -> str:
        """Extract subject from URL or page name"""
        if self.page_link:
            url_str = str(self.page_link)
            # Extract subject from URL patterns
            # Chemistry, Physics, Maths, AP Stats, etc.
            subject_patterns = {
                r'chemistry': 'Chemistry',
                r'physics': 'Physics',
                r'maths?': 'Maths',
                r'mathematics?': 'Maths',
                r'ap_stats?': 'AP Stats',
                r'statistics?': 'Statistics',
                r'biology': 'Biology',
                r'english': 'English',
                r'history': 'History',
                r'geography': 'Geography'
            }
            
            for pattern, subject in subject_patterns.items():
                if re.search(pattern, url_str, re.IGNORECASE):
                    return subject
        
        # Extract from page name if URL parsing fails
        page_lower = self.page_name.lower()
        for pattern, subject in {
            r'chemistry': 'Chemistry',
            r'physics': 'Physics',
            r'math': 'Maths',
            r'ap.?stat': 'AP Stats',
            r'biology': 'Biology',
            r'english': 'English'
        }.items():
            if re.search(pattern, page_lower):
                return subject
        
        return "General"
    
    @computed_field
    @property
    def year(self) -> Optional[str]:
        """Extract year from URL or page name"""
        if self.page_link:
            url_str = str(self.page_link)
            # Look for 4-digit years (1990-2099)
            year_match = re.search(r'(19[9][0-9]|20[0-9][0-9])', url_str)
            if year_match:
                return year_match.group(1)
        
        # Extract from page name
        year_match = re.search(r'(19[9][0-9]|20[0-9][0-9])', self.page_name)
        if year_match:
            return year_match.group(1)
        
        return None
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "page_name": "Mathematics Chapter 1",
                "page_link": "https://example.com/math-ch1",
                "total_questions": 25,
                "completed_questions": 10,
                "status": "In Progress"
            }
        }
    }

class PageCreate(BaseModel):
    page_name: str = Field(..., min_length=1, max_length=200)
    page_link: Optional[HttpUrl] = None
    total_questions: int = Field(..., ge=1)
    status: StatusEnum = Field(default=StatusEnum.PENDING)

class PageUpdate(BaseModel):
    completed_questions: int = Field(..., ge=0)
    status: Optional[StatusEnum] = None

class MilestoneSummary(BaseModel):
    total_questions: int
    completed_questions: int
    remaining_questions: int
    progress_percentage: float
    total_pages: int
    completed_pages: int
    pending_pages: int
    in_progress_pages: int
    deadline: str
    created_date: str
    days_remaining: int
    milestone_amount: int
    allocated_questions: int
    unallocated_questions: int
    payment_status: str
    current_milestone: Optional[MilestoneModel] = None
    all_milestones: List[MilestoneModel] = []
    project_total_questions: int = 480

class ReminderResponse(BaseModel):
    remaining_questions: int
    average_daily_rate: float
    estimated_completion_date: str
    days_behind_schedule: int
    performance_trend: str
    recommendation: str
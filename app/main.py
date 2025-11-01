import os
import logging
import re
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from app.database import db_manager
from app.models import PageModel, PageCreate, PageUpdate, MilestoneSummary, ReminderResponse, StatusEnum, MilestoneModel, MilestoneCreate, MilestoneUpdate, PaymentStatusEnum
from app.auth import verify_admin_access, AdminLogin, AdminLoginResponse, verify_admin_credentials, create_admin_token

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Scheduler for automatic backups
scheduler = AsyncIOScheduler()

async def automated_backup():
    """Automated backup task"""
    try:
        backup_path = await db_manager.backup_data()
        logger.info(f"Automated backup completed: {backup_path}")
    except Exception as e:
        logger.error(f"Automated backup failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    try:
        await db_manager.connect_to_mongo()
        
        # Schedule daily backups at 2 AM
        scheduler.add_job(
            automated_backup,
            CronTrigger(hour=2, minute=0),
            id="daily_backup",
            replace_existing=True
        )
        scheduler.start()
        logger.info("Application started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        scheduler.shutdown()
        await db_manager.close_mongo_connection()
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI app
app = FastAPI(
    title="IITian Academy Milestone Tracker",
    description="Professional milestone and question tracker for Freelancer.com projects",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Root endpoint - Dashboard
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    """Admin panel page"""
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/test-results", response_class=HTMLResponse)
async def test_results(request: Request):
    """Test results page"""
    with open("test-results.html", "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)

# Authentication Endpoints

@app.post("/api/auth/login", response_model=AdminLoginResponse)
async def admin_login(login_data: AdminLogin):
    """Admin login endpoint"""
    try:
        is_valid = await verify_admin_credentials(login_data.email, login_data.password)
        
        if not is_valid:
            return AdminLoginResponse(
                success=False,
                message="Invalid email or password"
            )
        
        # Create JWT token
        token = create_admin_token(login_data.email)
        
        return AdminLoginResponse(
            success=True,
            message="Login successful",
            token=token
        )
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return AdminLoginResponse(
            success=False,
            message="Login failed due to server error"
        )

@app.get("/api/admin/api-key")
async def get_admin_api_key():
    """Get the admin API key for authenticated sessions"""
    return {
        "api_key": os.getenv("ADMIN_API_KEY")
    }

# API Endpoints

@app.post("/api/add_page", status_code=201)
async def add_page(
    page_data: PageCreate, 
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Add a new page (Admin only)"""
    try:
        page_dict = page_data.model_dump()
        # Convert URL object to string if it exists
        if page_dict.get('page_link'):
            page_dict['page_link'] = str(page_dict['page_link'])
        page_id = await db_manager.create_page(page_dict)
        
        # Trigger backup after update
        background_tasks.add_task(automated_backup)
        
        return {
            "message": "Page created successfully",
            "page_id": page_id,
            "data": page_dict
        }
    except Exception as e:
        logger.error(f"Error adding page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/update_page/{page_id}")
async def update_page(
    page_id: str, 
    update_data: PageUpdate,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Update page progress (Admin only)"""
    try:
        # Get current page to validate
        current_page = await db_manager.get_page_by_id(page_id)
        if not current_page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Validate completed questions doesn't exceed total
        if update_data.completed_questions > current_page.get("total_questions", 0):
            raise HTTPException(
                status_code=400, 
                detail="Completed questions cannot exceed total questions"
            )
        
        # Auto-update status based on progress
        update_dict = update_data.dict(exclude_unset=True)
        
        if update_data.completed_questions == current_page.get("total_questions", 0):
            update_dict["status"] = StatusEnum.COMPLETED
        elif update_data.completed_questions > 0:
            if update_dict.get("status") != StatusEnum.COMPLETED:
                update_dict["status"] = StatusEnum.IN_PROGRESS
        
        success = await db_manager.update_page(page_id, update_dict)
        
        if success:
            # Trigger backup after update
            background_tasks.add_task(automated_backup)
            
            updated_page = await db_manager.get_page_by_id(page_id)
            return {
                "message": "Page updated successfully",
                "data": updated_page
            }
        else:
            raise HTTPException(status_code=404, detail="Page not found or not updated")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating page {page_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/progress")
async def get_progress():
    """Get milestone summary (Public)"""
    try:
        summary = await db_manager.get_milestone_summary()
        return summary
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/public/milestones")
async def get_public_milestones():
    """Get all milestones for public view (No authentication required)"""
    try:
        milestones = await db_manager.get_all_milestones()
        # Return in same format as other endpoints for consistency
        return {"milestones": milestones}
    except Exception as e:
        logger.error(f"Error getting public milestones: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/page/{page_id}")
async def get_page(page_id: str):
    """Get individual page details (Public)"""
    try:
        page = await db_manager.get_page_by_id(page_id)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Calculate dynamic fields
        page["remaining_questions"] = max(0, page.get("total_questions", 0) - page.get("completed_questions", 0))
        page["progress_percentage"] = round(
            (page.get("completed_questions", 0) / page.get("total_questions", 1)) * 100, 2
        ) if page.get("total_questions", 0) > 0 else 0
        
        return page
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting page {page_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pages")
async def get_all_pages():
    """Get all pages (Public)"""
    try:
        pages = await db_manager.get_all_pages()
        
        # Calculate dynamic fields for each page and add subject/year extraction
        for page in pages:
            # Ensure completed_questions field exists (default to 0 if missing)
            if "completed_questions" not in page:
                page["completed_questions"] = 0
            
            # Auto-set completed_questions based on status if missing
            if page.get("status") == "Completed" and page.get("completed_questions", 0) == 0:
                page["completed_questions"] = page.get("total_questions", 0)
            
            # Calculate remaining questions and progress
            completed = page.get("completed_questions", 0)
            total = page.get("total_questions", 0)
            
            page["remaining_questions"] = max(0, total - completed)
            page["progress_percentage"] = round(
                (completed / total) * 100, 2
            ) if total > 0 else 0
            
            # Extract subject from URL only if missing
            page_link = page.get("page_link", "")
            if page_link and (not page.get("subject") or page.get("subject") == "General"):
                url_str = str(page_link)
                subject_patterns = {
                    r'chemistry': 'Chemistry',
                    r'physics': 'Physics',
                    r'maths?': 'Maths',
                    r'mathematics?': 'Maths',
                    r'ap_stats?': 'AP Stats',
                    r'statistics?': 'Statistics',
                    r'biology': 'Biology',
                    r'english': 'English'
                }
                
                subject = "General"
                for pattern, subj in subject_patterns.items():
                    if re.search(pattern, url_str, re.IGNORECASE):
                        subject = subj
                        break
                page["subject"] = subject
            elif not page.get("subject"):
                page["subject"] = "General"
            
            # Extract year from URL only if missing or N/A
            if page_link and (not page.get("year") or page.get("year") == "N/A" or page.get("year") == ""):
                url_str = str(page_link)
                year_match = re.search(r'(20[1-3][0-9])', url_str)
                page["year"] = year_match.group(1) if year_match else "N/A"
            elif not page.get("year"):
                page["year"] = "N/A"
        
        return {"pages": pages}
    except Exception as e:
        logger.error(f"Error getting all pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pages", status_code=201)
async def create_page(
    page_data: dict,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Create a new page (Admin only)"""
    try:
        # Auto-set page name from URL if not provided
        if not page_data.get("page_name") and page_data.get("page_link"):
            url = page_data["page_link"]
            # Extract a meaningful name from URL
            url_parts = url.split("/")
            page_name = url_parts[-1] or url_parts[-2]
            page_name = page_name.replace("_", " ").title()
            page_data["page_name"] = page_name
        
        # Auto-set status based on completion
        total_questions = page_data.get("total_questions", 0)
        completed_questions = page_data.get("completed_questions", 0)
        
        if completed_questions >= total_questions and total_questions > 0:
            page_data["status"] = "Completed"
        elif completed_questions > 0:
            page_data["status"] = "In Progress"
        else:
            page_data["status"] = "Pending"
        
        # Auto-extract subject and year from URL if not provided
        if not page_data.get("subject") and page_data.get("page_link"):
            url_str = str(page_data["page_link"])
            subject_patterns = {
                r'chemistry': 'Chemistry',
                r'physics': 'Physics', 
                r'maths?': 'Maths',
                r'mathematics?': 'Maths',
                r'ap_stats?': 'AP Stats',
                r'biology': 'Biology'
            }
            
            subject = "Other"
            for pattern, subj in subject_patterns.items():
                if re.search(pattern, url_str, re.IGNORECASE):
                    subject = subj
                    break
            page_data["subject"] = subject
        
        if not page_data.get("year") and page_data.get("page_link"):
            url_str = str(page_data["page_link"])
            year_match = re.search(r'(20[1-3][0-9])', url_str)
            page_data["year"] = year_match.group(1) if year_match else "2024"
        
        page_id = await db_manager.create_page(page_data)
        background_tasks.add_task(automated_backup)
        
        return {
            "message": "Page created successfully",
            "page_id": page_id
        }
    except Exception as e:
        logger.error(f"Error creating page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/pages/{page_id}")
async def update_page(
    page_id: str,
    page_data: dict,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Update a page (Admin only)"""
    try:
        # Remove immutable fields that shouldn't be updated
        page_data.pop("_id", None)
        page_data.pop("id", None)
        page_data.pop("created_at", None)
        
        # Auto-set status based on completion
        total_questions = page_data.get("total_questions", 0)
        completed_questions = page_data.get("completed_questions", 0)
        
        if completed_questions >= total_questions and total_questions > 0:
            page_data["status"] = "Completed"
        elif completed_questions > 0:
            page_data["status"] = "In Progress"
        else:
            page_data["status"] = "Pending"
        
        success = await db_manager.update_page(page_id, page_data)
        if not success:
            raise HTTPException(status_code=404, detail="Page not found")
        
        background_tasks.add_task(automated_backup)
        
        return {
            "message": "Page updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/pages/{page_id}")
async def delete_page(
    page_id: str,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Delete a page (Admin only)"""
    try:
        success = await db_manager.delete_page(page_id)
        if not success:
            raise HTTPException(status_code=404, detail="Page not found")
        
        background_tasks.add_task(automated_backup)
        
        return {
            "message": "Page deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reminder")
async def get_reminder():
    """Calculate progress reminder and performance analysis (Public)"""
    try:
        summary = await db_manager.get_milestone_summary()
        
        if not summary:
            raise HTTPException(status_code=500, detail="Unable to calculate reminder")
        
        # Calculate performance metrics
        remaining_questions = summary.get("remaining_questions", 0)
        days_remaining = summary.get("days_remaining", 0)
        completed_questions = summary.get("completed_questions", 0)
        
        # Calculate days since project started
        created_date = datetime.strptime(os.getenv("MILESTONE_CREATED", "2025-10-13"), "%Y-%m-%d")
        days_elapsed = (datetime.now() - created_date).days
        days_elapsed = max(1, days_elapsed)  # Avoid division by zero
        
        # Calculate average daily completion rate
        average_daily_rate = completed_questions / days_elapsed
        
        # Estimate completion date
        days_needed = 0
        if average_daily_rate > 0:
            days_needed = remaining_questions / average_daily_rate
            from datetime import timedelta
            estimated_completion = datetime.now() + timedelta(days=days_needed)
            estimated_completion_date = estimated_completion.strftime("%Y-%m-%d")
        else:
            estimated_completion_date = "Unknown (no progress detected)"
        
        # Performance analysis
        required_daily_rate = remaining_questions / max(1, days_remaining)
        days_behind_schedule = max(0, int(days_needed - days_remaining)) if average_daily_rate > 0 else 0
        
        if average_daily_rate >= required_daily_rate:
            performance_trend = "On Track"
            recommendation = "Maintain current pace to meet deadline"
        elif average_daily_rate >= required_daily_rate * 0.8:
            performance_trend = "Slightly Behind"
            recommendation = "Increase daily output slightly to meet deadline"
        else:
            performance_trend = "Behind Schedule"
            recommendation = "Significant increase in daily output required"
        
        return {
            "remaining_questions": remaining_questions,
            "average_daily_rate": round(average_daily_rate, 2),
            "estimated_completion_date": estimated_completion_date,
            "days_behind_schedule": days_behind_schedule,
            "performance_trend": performance_trend,
            "recommendation": recommendation,
            "required_daily_rate": round(required_daily_rate, 2),
            "days_remaining": days_remaining
        }
        
    except Exception as e:
        logger.error(f"Error calculating reminder: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup")
async def create_backup(admin_verified: bool = Depends(verify_admin_access)):
    """Create manual backup (Admin only)"""
    try:
        backup_path = await db_manager.backup_data()
        return {
            "message": "Backup created successfully",
            "backup_path": backup_path,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/page/{page_id}")
async def delete_page(
    page_id: str,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Delete a page (Admin only)"""
    try:
        success = await db_manager.delete_page(page_id)
        if success:
            # Trigger backup after deletion
            background_tasks.add_task(automated_backup)
            return {"message": "Page deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Page not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting page {page_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Milestone Management Endpoints

@app.post("/api/milestones", status_code=201)
async def create_milestone(
    milestone_data: MilestoneCreate,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Create a new milestone (Admin only) - Auto-calculates question ranges"""
    try:
        milestone_dict = milestone_data.model_dump()
        
        # Get all existing milestones to calculate the next range
        existing_milestones = await db_manager.get_all_milestones()
        
        # Find the highest end_question from existing milestones
        if existing_milestones:
            max_end_question = max([m.get("end_question", 0) for m in existing_milestones])
            start_question = max_end_question + 1
        else:
            start_question = 1
        
        # Calculate end question based on total_questions
        total_questions = milestone_dict.get("total_questions", 480)
        end_question = start_question + total_questions - 1
        
        # Add calculated fields
        milestone_dict["start_question"] = start_question
        milestone_dict["end_question"] = end_question
        milestone_dict["question_range"] = f"{start_question}-{end_question}"
        milestone_dict["milestone_number"] = len(existing_milestones) + 1
        
        milestone_id = await db_manager.create_milestone(milestone_dict)
        
        # Trigger backup after creation
        background_tasks.add_task(automated_backup)
        
        return {
            "message": f"Milestone created successfully! Questions {start_question}-{end_question}",
            "milestone_id": milestone_id,
            "question_range": f"{start_question}-{end_question}"
        }
    except Exception as e:
        logger.error(f"Error creating milestone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/milestones")
async def get_all_milestones(admin_verified: bool = Depends(verify_admin_access)):
    """Get all milestones (Admin only)"""
    try:
        milestones = await db_manager.get_all_milestones()
        return milestones
    except Exception as e:
        logger.error(f"Error getting milestones: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/milestones/{milestone_id}")
async def get_milestone(milestone_id: str):
    """Get a specific milestone by ID"""
    try:
        milestone = await db_manager.get_milestone_by_id(milestone_id)
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return milestone
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting milestone {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/milestones/{milestone_id}")
async def update_milestone(
    milestone_id: str,
    update_data: MilestoneUpdate,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Update a milestone (Admin only)"""
    try:
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        success = await db_manager.update_milestone(milestone_id, update_dict)
        if not success:
            raise HTTPException(status_code=404, detail="Milestone not found or no changes made")
        
        # Trigger backup after update
        background_tasks.add_task(automated_backup)
        
        return {"message": "Milestone updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/milestones/{milestone_id}/payment-status")
async def update_payment_status(
    milestone_id: str,
    payment_status: PaymentStatusEnum,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Update milestone payment status (Admin only)"""
    try:
        success = await db_manager.update_payment_status(milestone_id, payment_status)
        if not success:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        # Trigger backup after update
        background_tasks.add_task(automated_backup)
        
        return {
            "message": f"Payment status updated to {payment_status.value}",
            "payment_status": payment_status.value
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment status for milestone {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: str,
    background_tasks: BackgroundTasks,
    admin_verified: bool = Depends(verify_admin_access)
):
    """Delete a milestone (Admin only)"""
    try:
        success = await db_manager.delete_milestone(milestone_id)
        if not success:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        # Trigger backup after deletion
        background_tasks.add_task(automated_backup)
        
        return {"message": "Milestone deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting milestone {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/milestones/current")
async def get_current_milestone():
    """Get the current active milestone"""
    try:
        current_milestone = await db_manager.get_current_milestone()
        if not current_milestone:
            return {"message": "No active milestone found", "milestone": None}
        return {"milestone": current_milestone}
    except Exception as e:
        logger.error(f"Error getting current milestone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
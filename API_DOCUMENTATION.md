# 📚 IITian Academy Milestone Tracker - API Documentation

## Base URL
- **Local Development:** `http://localhost:8000`
- **Production:** `https://your-app-name.onrender.com`

## Authentication

### Admin API Key
All write operations (POST, PUT, DELETE) require an admin API key in the request header:

```http
X-API-Key: your-admin-api-key-here
```

### Public Endpoints
Read operations (GET) are publicly accessible for client transparency.

## 📊 API Endpoints

### 1. Health Check
**GET** `/health`

Check application health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-16T10:30:00Z",
  "version": "1.0.0"
}
```

### 2. Dashboard
**GET** `/`

Serves the main dashboard HTML page.

**Response:** HTML page with interactive dashboard

### 3. Get All Pages
**GET** `/api/pages`

Retrieve all question pages with progress information.

**Response:**
```json
{
  "pages": [
    {
      "_id": "6708a1b2c4d5e6f7g8h9i0j1",
      "page_name": "Mathematics Chapter 1",
      "page_link": "https://example.com/math-ch1",
      "total_questions": 25,
      "completed_questions": 15,
      "remaining_questions": 10,
      "progress_percentage": 60.0,
      "status": "In Progress",
      "created_at": "2025-10-13T08:00:00Z",
      "updated_at": "2025-10-16T10:30:00Z"
    }
  ]
}
```

### 4. Get Single Page
**GET** `/api/page/{page_id}`

Retrieve details for a specific page.

**Parameters:**
- `page_id` (string): MongoDB ObjectId of the page

**Response:**
```json
{
  "_id": "6708a1b2c4d5e6f7g8h9i0j1",
  "page_name": "Mathematics Chapter 1",
  "page_link": "https://example.com/math-ch1",
  "total_questions": 25,
  "completed_questions": 15,
  "remaining_questions": 10,
  "progress_percentage": 60.0,
  "status": "In Progress",
  "created_at": "2025-10-13T08:00:00Z",
  "updated_at": "2025-10-16T10:30:00Z"
}
```

**Error Response (404):**
```json
{
  "detail": "Page not found"
}
```

### 5. Get Progress Summary
**GET** `/api/progress`

Get overall milestone progress statistics.

**Response:**
```json
{
  "total_questions": 480,
  "completed_questions": 250,
  "remaining_questions": 230,
  "progress_percentage": 52.08,
  "total_pages": 15,
  "completed_pages": 5,
  "pending_pages": 7,
  "in_progress_pages": 3,
  "deadline": "2025-10-17",
  "created_date": "2025-10-13",
  "days_remaining": 1,
  "milestone_amount": 30
}
```

### 6. Get Performance Insights
**GET** `/api/reminder`

Get performance analytics and recommendations.

**Response:**
```json
{
  "remaining_questions": 230,
  "average_daily_rate": 83.33,
  "estimated_completion_date": "2025-10-18",
  "days_behind_schedule": 1,
  "performance_trend": "Slightly Behind",
  "recommendation": "Increase daily output slightly to meet deadline",
  "required_daily_rate": 230.0,
  "days_remaining": 1
}
```

### 7. Add New Page (Admin Only)
**POST** `/api/add_page`

Create a new question page.

**Headers:**
```http
Content-Type: application/json
X-API-Key: your-admin-api-key
```

**Request Body:**
```json
{
  "page_name": "Physics Chapter 2",
  "page_link": "https://example.com/physics-ch2",
  "total_questions": 30,
  "status": "Pending"
}
```

**Response (201):**
```json
{
  "message": "Page created successfully",
  "page_id": "6708a1b2c4d5e6f7g8h9i0j2",
  "data": {
    "page_name": "Physics Chapter 2",
    "page_link": "https://example.com/physics-ch2",
    "total_questions": 30,
    "status": "Pending",
    "created_at": "2025-10-16T10:30:00Z",
    "updated_at": "2025-10-16T10:30:00Z"
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid or missing API key. Admin access required."
}
```

### 8. Update Page Progress (Admin Only)
**PUT** `/api/update_page/{page_id}`

Update the completed questions count for a page.

**Headers:**
```http
Content-Type: application/json
X-API-Key: your-admin-api-key
```

**Parameters:**
- `page_id` (string): MongoDB ObjectId of the page

**Request Body:**
```json
{
  "completed_questions": 20,
  "status": "In Progress"
}
```

**Response:**
```json
{
  "message": "Page updated successfully",
  "data": {
    "_id": "6708a1b2c4d5e6f7g8h9i0j1",
    "page_name": "Mathematics Chapter 1",
    "total_questions": 25,
    "completed_questions": 20,
    "remaining_questions": 5,
    "progress_percentage": 80.0,
    "status": "In Progress",
    "updated_at": "2025-10-16T10:35:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "detail": "Completed questions cannot exceed total questions"
}
```

### 9. Delete Page (Admin Only)
**DELETE** `/api/page/{page_id}`

Delete a question page.

**Headers:**
```http
X-API-Key: your-admin-api-key
```

**Parameters:**
- `page_id` (string): MongoDB ObjectId of the page

**Response:**
```json
{
  "message": "Page deleted successfully"
}
```

**Error Response (404):**
```json
{
  "detail": "Page not found"
}
```

### 10. Create Manual Backup (Admin Only)
**POST** `/api/backup`

Trigger manual backup of all data.

**Headers:**
```http
X-API-Key: your-admin-api-key
```

**Response:**
```json
{
  "message": "Backup created successfully",
  "backup_path": "backups/tracker_backup_20251016_103000.json",
  "timestamp": "2025-10-16T10:30:00Z"
}
```

## 📝 Data Models

### Page Model
```json
{
  "_id": "string (ObjectId)",
  "page_name": "string (1-200 chars)",
  "page_link": "string (optional URL)",
  "total_questions": "integer (min: 1)",
  "completed_questions": "integer (min: 0, max: total_questions)",
  "status": "enum (Pending|In Progress|Completed)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Status Enum Values
- `Pending`: Not started
- `In Progress`: Work in progress
- `Completed`: All questions finished

### Automatic Status Updates
The system automatically updates status based on completion:
- `completed_questions = 0` → `Pending`
- `0 < completed_questions < total_questions` → `In Progress`  
- `completed_questions = total_questions` → `Completed`

## 🔧 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "detail": "Error message description"
}
```

### Common Errors

**Invalid API Key (401):**
```json
{
  "detail": "Invalid or missing API key. Admin access required."
}
```

**Validation Error (400):**
```json
{
  "detail": "Completed questions cannot exceed total questions"
}
```

**Not Found (404):**
```json
{
  "detail": "Page not found"
}
```

## 🧪 Testing the API

### Using cURL

#### Get Progress Summary
```bash
curl -X GET "http://localhost:8000/api/progress"
```

#### Add New Page
```bash
curl -X POST "http://localhost:8000/api/add_page" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-admin-key" \
  -d '{
    "page_name": "Test Page",
    "total_questions": 10,
    "status": "Pending"
  }'
```

#### Update Page Progress
```bash
curl -X PUT "http://localhost:8000/api/update_page/PAGE_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-admin-key" \
  -d '{
    "completed_questions": 5
  }'
```

### Using Python Requests

```python
import requests

# Base URL
base_url = "http://localhost:8000"
admin_key = "your-admin-api-key"

# Get progress
response = requests.get(f"{base_url}/api/progress")
print(response.json())

# Add page (admin)
page_data = {
    "page_name": "New Chapter",
    "total_questions": 20,
    "status": "Pending"
}
headers = {"X-API-Key": admin_key}
response = requests.post(
    f"{base_url}/api/add_page", 
    json=page_data, 
    headers=headers
)
print(response.json())
```

### Using JavaScript Fetch

```javascript
// Get progress (public)
fetch('/api/progress')
  .then(response => response.json())
  .then(data => console.log(data));

// Update page (admin)
const updateData = {
  completed_questions: 15
};

fetch(`/api/update_page/${pageId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-admin-key'
  },
  body: JSON.stringify(updateData)
})
.then(response => response.json())
.then(data => console.log(data));
```

## 🔄 Automated Features

### Backup System
- **Automatic:** Daily at 2 AM server time
- **Triggered:** After each data update
- **Location:** `/backups/tracker_backup_YYYYMMDD_HHMMSS.json`
- **Format:** JSON with timestamp, pages, and summary

### Real-time Updates
- Dashboard auto-refreshes every 30 seconds
- Progress calculations are dynamic
- Status updates automatically based on completion

### Performance Analytics
The `/api/reminder` endpoint calculates:
- Average daily completion rate
- Estimated completion date
- Days behind/ahead of schedule
- Performance trend analysis
- Actionable recommendations

## 📊 Rate Limiting

Currently no rate limiting is implemented, but recommended limits:
- **Public endpoints:** 100 requests/minute
- **Admin endpoints:** 60 requests/minute
- **Backup endpoint:** 5 requests/hour

## 🔐 Security Considerations

### API Key Security
- Store admin API key securely in environment variables
- Use HTTPS in production
- Rotate API keys regularly
- Monitor API usage logs

### Data Validation
- All inputs are validated using Pydantic models
- SQL injection prevention (using MongoDB)
- XSS protection in frontend
- CORS properly configured

## 📱 Interactive Documentation

Visit `/docs` on your running server for interactive API documentation with:
- Request/response examples
- Try-it-out functionality
- Schema definitions
- Authentication testing

Example: `http://localhost:8000/docs`
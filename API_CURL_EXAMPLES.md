# Milestone Tracker - API Curl Examples

This document contains all API endpoints with curl commands and their example outputs.

---

## Table of Contents
1. [Public Endpoints (No Auth Required)](#public-endpoints)
2. [Protected Endpoints (Auth Required)](#protected-endpoints)
3. [Admin Endpoints](#admin-endpoints)

---

## Public Endpoints

### 1. Get All Pages
```bash
curl -s http://localhost:8000/api/pages
```

### 2. Get Public Milestones
```bash
curl -s http://localhost:8000/api/public/milestones
```

### 3. Get Progress (Public)
```bash
curl -s http://localhost:8000/api/progress
```

### 4. Health Check
```bash
curl -s http://localhost:8000/health
```

---

## Protected Endpoints

### Authentication - Login
```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'
```

### Get Milestones (Authenticated)
```bash
curl -s http://localhost:8000/api/milestones \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Admin Endpoints

### Create Page
```bash
curl -s -X POST http://localhost:8000/api/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "page_name": "Test Page",
    "page_link": "https://example.com/test",
    "total_questions": 50,
    "completed_questions": 25,
    "subject": "Chemistry",
    "year": 2024,
    "status": "In Progress"
  }'
```

### Update Page
```bash
curl -s -X PUT http://localhost:8000/api/pages/PAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "completed_questions": 50,
    "status": "Completed"
  }'
```

### Delete Page
```bash
curl -s -X DELETE http://localhost:8000/api/pages/PAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Run the Live Examples Script

To see all endpoints with live output, run:
```bash
./api_curl_live.sh
```


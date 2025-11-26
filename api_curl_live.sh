#!/bin/bash

# ============================================================================
# MILESTONE TRACKER - API CURL EXAMPLES WITH LIVE OUTPUT
# ============================================================================
# This script demonstrates all API endpoints with actual responses
# Run: chmod +x api_curl_live.sh && ./api_curl_live.sh
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

BASE_URL="http://localhost:8000"

# Print header
header() {
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${WHITE}  $1${PURPLE}$(printf '%*s' $((63 - ${#1})) '')║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Print section
section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Print curl command
show_curl() {
    echo -e "${YELLOW}CURL COMMAND:${NC}"
    echo -e "${WHITE}$1${NC}"
    echo ""
}

# Print response
show_response() {
    echo -e "${GREEN}RESPONSE:${NC}"
}

# Check server
check_server() {
    header "MILESTONE TRACKER - API CURL EXAMPLES"
    echo -e "${BLUE}Base URL:${NC} $BASE_URL"
    echo -e "${BLUE}Date:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/pages" 2>/dev/null)
    if [ "$RESPONSE" != "200" ]; then
        echo -e "${RED}❌ Server is not running!${NC}"
        echo "Start with: python -m uvicorn app.main:app --reload --port 8000"
        exit 1
    fi
    echo -e "${GREEN}✅ Server is running${NC}"
}
#./api_curl_live.sh --all    # Full test
#./api_curl_live.sh --help   # See options
# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

public_endpoints() {
    header "PUBLIC ENDPOINTS (No Authentication Required)"
    
    # 1. Health Check
    section "1. Health Check"
    show_curl "curl -s $BASE_URL/health"
    show_response
    curl -s "$BASE_URL/health" 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/health"
    
    # 2. Get All Pages
    section "2. Get All Pages"
    show_curl "curl -s $BASE_URL/api/pages"
    show_response
    curl -s "$BASE_URL/api/pages" | python3 -c "
import json, sys
data = json.load(sys.stdin)
pages = data.get('pages', [])
print(f'Total Pages: {len(pages)}')
print()
print('First 3 pages:')
for i, p in enumerate(pages[:3], 1):
    name = (p.get('page_name', 'N/A') or 'N/A')[:40]
    print(f'  {i}. {name}')
    print(f'     Total: {p.get(\"total_questions\", 0)}, Completed: {p.get(\"completed_questions\", 0)}')
print()
print(f'... and {len(pages) - 3} more pages')
"

    # 3. Get Single Page (first page ID)
    section "3. Get Single Page by ID"
    FIRST_PAGE_ID=$(curl -s "$BASE_URL/api/pages" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['pages'][0]['_id'] if d.get('pages') else '')" 2>/dev/null)
    show_curl "curl -s $BASE_URL/api/pages/$FIRST_PAGE_ID"
    show_response
    curl -s "$BASE_URL/api/pages/$FIRST_PAGE_ID" | python3 -m json.tool 2>/dev/null | head -20
    echo "  ..."
    
    # 4. Get Public Milestones
    section "4. Get Public Milestones"
    show_curl "curl -s $BASE_URL/api/public/milestones"
    show_response
    curl -s "$BASE_URL/api/public/milestones" | python3 -c "
import json, sys
data = json.load(sys.stdin)
milestones = data.get('milestones', [])
print(f'Total Milestones: {len(milestones)}')
print()
for i, m in enumerate(milestones, 1):
    title = m.get('title', f'Milestone {i}')
    start = m.get('question_range_start', m.get('start_question', '?'))
    end = m.get('question_range_end', m.get('end_question', '?'))
    completed = m.get('completed_questions', 0)
    total = m.get('total_questions', 0)
    progress = round((completed/total*100) if total > 0 else 0, 1)
    print(f'  M{i}: {title}')
    print(f'      Range: Q{start}-Q{end} ({total} questions)')
    print(f'      Completed: {completed}/{total} ({progress}%)')
    print()
"

    # 5. Get Progress
    section "5. Get Progress Data"
    show_curl "curl -s $BASE_URL/api/progress"
    show_response
    curl -s "$BASE_URL/api/progress" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Current Milestone Progress:')
print(f'  Title: {data.get(\"current_milestone_title\", \"N/A\")}')
print(f'  Range: Q{data.get(\"current_milestone_start\", \"?\")}-Q{data.get(\"current_milestone_end\", \"?\")}')
print(f'  Completed: {data.get(\"completed_questions\", 0)}/{data.get(\"total_questions\", 0)}')
print(f'  Progress: {data.get(\"progress_percentage\", 0)}%')
print()
print('Overall Progress:')
print(f'  Completed: {data.get(\"overall_completed\", 0)}/{data.get(\"overall_total\", 0)}')
print(f'  Progress: {data.get(\"overall_progress_percentage\", 0)}%')
"
}

# ============================================================================
# AUTHENTICATION
# ============================================================================

auth_endpoints() {
    header "AUTHENTICATION ENDPOINTS"
    
    section "1. Admin Login"
    show_curl 'curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '"'"'{"username": "admin", "password": "YOUR_PASSWORD"}'"'"''
    echo -e "${YELLOW}Note: Replace YOUR_PASSWORD with actual admin password${NC}"
    echo ""
    echo -e "${GREEN}Expected Response (on success):${NC}"
    echo '{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}'
    
    section "2. Verify Token"
    show_curl 'curl -s $BASE_URL/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"'
    echo -e "${GREEN}Expected Response:${NC}"
    echo '{
  "valid": true,
  "username": "admin"
}'
}

# ============================================================================
# PROTECTED ENDPOINTS (Require Auth)
# ============================================================================

protected_endpoints() {
    header "PROTECTED ENDPOINTS (Authentication Required)"
    
    echo -e "${YELLOW}Note: These endpoints require a valid JWT token.${NC}"
    echo -e "${YELLOW}Get token from /api/auth/login first.${NC}"
    echo ""
    
    section "1. Get Milestones (Admin)"
    show_curl 'curl -s $BASE_URL/api/milestones \
  -H "Authorization: Bearer YOUR_TOKEN"'
    echo -e "${GREEN}Expected Response:${NC}"
    echo '[
  {
    "_id": "...",
    "title": "Milestone 1: Questions 480",
    "start_question": 1,
    "end_question": 480,
    "total_questions": 480,
    "completed_questions": 480,
    ...
  },
  ...
]'

    section "2. Create New Page"
    show_curl 'curl -s -X POST $BASE_URL/api/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '"'"'{
    "page_name": "AP Chemistry 2024 MCQ",
    "page_link": "https://www.iitianacademy.com/ap_chemistry_2024_mcq/",
    "total_questions": 60,
    "completed_questions": 0,
    "subject": "Chemistry",
    "year": 2024,
    "status": "Pending"
  }'"'"''
    echo ""
    echo -e "${GREEN}Expected Response:${NC}"
    echo '{
  "_id": "new_page_id_here",
  "page_name": "AP Chemistry 2024 MCQ",
  "total_questions": 60,
  ...
}'

    section "3. Update Page"
    show_curl 'curl -s -X PUT $BASE_URL/api/pages/PAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '"'"'{
    "completed_questions": 60,
    "status": "Completed"
  }'"'"''
    echo ""
    echo -e "${GREEN}Expected Response:${NC}"
    echo '{
  "success": true,
  "message": "Page updated successfully"
}'

    section "4. Delete Page"
    show_curl 'curl -s -X DELETE $BASE_URL/api/pages/PAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"'
    echo ""
    echo -e "${GREEN}Expected Response:${NC}"
    echo '{
  "success": true,
  "message": "Page deleted successfully"
}'

    section "5. Update Milestone"
    show_curl 'curl -s -X PUT $BASE_URL/api/milestones/MILESTONE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '"'"'{
    "title": "Milestone 1: Questions 480",
    "deadline": "2025-12-31",
    "amount": 1000
  }'"'"''
    echo ""
    echo -e "${GREEN}Expected Response:${NC}"
    echo '{
  "success": true,
  "message": "Milestone updated successfully"
}'
}

# ============================================================================
# QUICK REFERENCE
# ============================================================================

quick_reference() {
    header "QUICK REFERENCE - ALL ENDPOINTS"
    
    echo -e "${WHITE}PUBLIC (No Auth):${NC}"
    echo "  GET  /health                    - Health check"
    echo "  GET  /api/pages                 - List all pages"
    echo "  GET  /api/pages/{id}            - Get single page"
    echo "  GET  /api/public/milestones     - Get milestones (public)"
    echo "  GET  /api/progress              - Get progress data"
    echo ""
    echo -e "${WHITE}AUTHENTICATION:${NC}"
    echo "  POST /api/auth/login            - Login, get JWT token"
    echo "  GET  /api/auth/verify           - Verify token"
    echo ""
    echo -e "${WHITE}PROTECTED (Require Token):${NC}"
    echo "  GET  /api/milestones            - List milestones (admin)"
    echo "  POST /api/pages                 - Create new page"
    echo "  PUT  /api/pages/{id}            - Update page"
    echo "  DELETE /api/pages/{id}          - Delete page"
    echo "  PUT  /api/milestones/{id}       - Update milestone"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Usage Examples:${NC}"
    echo ""
    echo "# Get all pages (pretty print)"
    echo "curl -s http://localhost:8000/api/pages | python3 -m json.tool"
    echo ""
    echo "# Get page count"
    echo 'curl -s http://localhost:8000/api/pages | python3 -c "import json,sys; print(len(json.load(sys.stdin)[\"pages\"]))"'
    echo ""
    echo "# Get overall progress"
    echo 'curl -s http://localhost:8000/api/progress | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d[\"overall_progress_percentage\"]}%\")"'
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    clear
    check_server
    
    echo ""
    echo -e "${WHITE}Select what to show:${NC}"
    echo "  1) All endpoints (full demo)"
    echo "  2) Public endpoints only"
    echo "  3) Authentication examples"
    echo "  4) Protected endpoints (admin)"
    echo "  5) Quick reference"
    echo "  q) Quit"
    echo ""
    read -p "Enter choice [1-5, q]: " choice
    
    case $choice in
        1)
            public_endpoints
            auth_endpoints
            protected_endpoints
            quick_reference
            ;;
        2)
            public_endpoints
            ;;
        3)
            auth_endpoints
            ;;
        4)
            protected_endpoints
            ;;
        5)
            quick_reference
            ;;
        q|Q)
            echo "Bye!"
            exit 0
            ;;
        *)
            echo "Running all..."
            public_endpoints
            auth_endpoints
            protected_endpoints
            quick_reference
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Done! All curl examples shown above.${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Run if no arguments, or run specific section
if [ "$1" == "--public" ]; then
    check_server
    public_endpoints
elif [ "$1" == "--auth" ]; then
    check_server
    auth_endpoints
elif [ "$1" == "--protected" ]; then
    check_server
    protected_endpoints
elif [ "$1" == "--quick" ]; then
    quick_reference
elif [ "$1" == "--all" ]; then
    check_server
    public_endpoints
    auth_endpoints
    protected_endpoints
    quick_reference
else
    main
fi

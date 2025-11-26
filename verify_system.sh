#!/bin/bash

# ============================================================================
# MILESTONE TRACKER - SYSTEM VERIFICATION SCRIPT
# ============================================================================
# This script verifies all aspects of the milestone tracker system
# Run: chmod +x verify_system.sh && ./verify_system.sh
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:8000"

# Separator function
separator() {
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if server is running
check_server() {
    separator "🔍 CHECKING SERVER STATUS"
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/pages" 2>/dev/null)
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ Server is running at $BASE_URL${NC}"
    else
        echo -e "${RED}❌ Server is NOT running at $BASE_URL (HTTP: $RESPONSE)${NC}"
        echo -e "${YELLOW}Please start the server with:${NC}"
        echo "cd milestone-tracker && source venv/bin/activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
        exit 1
    fi
}

# Check API endpoints
check_api_health() {
    separator "🏥 API HEALTH CHECK"
    
    echo -e "${CYAN}Testing /api/pages endpoint...${NC}"
    PAGES_RESPONSE=$(curl -s "$BASE_URL/api/pages")
    if echo "$PAGES_RESPONSE" | grep -q "pages"; then
        PAGES_COUNT=$(echo "$PAGES_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('pages', [])))" 2>/dev/null)
        echo -e "${GREEN}✅ /api/pages - OK ($PAGES_COUNT pages found)${NC}"
    else
        echo -e "${RED}❌ /api/pages - FAILED${NC}"
    fi
    
    echo -e "${CYAN}Testing /api/public/milestones endpoint...${NC}"
    MS_RESPONSE=$(curl -s "$BASE_URL/api/public/milestones")
    if echo "$MS_RESPONSE" | grep -q "milestones"; then
        MS_COUNT=$(echo "$MS_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('milestones', [])))" 2>/dev/null)
        echo -e "${GREEN}✅ /api/public/milestones - OK ($MS_COUNT milestones found)${NC}"
    else
        echo -e "${RED}❌ /api/public/milestones - FAILED${NC}"
    fi
    
    echo -e "${CYAN}Testing /api/progress endpoint...${NC}"
    PROGRESS_RESPONSE=$(curl -s "$BASE_URL/api/progress")
    if echo "$PROGRESS_RESPONSE" | grep -q "overall_progress_percentage\|progress_percentage"; then
        echo -e "${GREEN}✅ /api/progress - OK${NC}"
    else
        echo -e "${RED}❌ /api/progress - FAILED${NC}"
    fi
}

# Verify milestone definitions
verify_milestones() {
    separator "🎯 MILESTONE DEFINITIONS"
    
    curl -s "$BASE_URL/api/public/milestones" | python3 -c "
import json, sys

data = json.load(sys.stdin)
milestones = data.get('milestones', [])

print('Milestone Details:')
print('-' * 60)

total_questions = 0
total_completed = 0

for i, m in enumerate(milestones, 1):
    title = m.get('title', f'Milestone {i}')
    start = m.get('question_range_start', m.get('start_question', 0))
    end = m.get('question_range_end', m.get('end_question', 0))
    questions = end - start + 1
    completed = m.get('completed_questions', 0)
    progress = round((completed / questions * 100) if questions > 0 else 0, 1)
    
    total_questions += questions
    total_completed += completed
    
    status = '✅ COMPLETE' if progress == 100 else '🔄 IN PROGRESS' if progress > 0 else '⏳ NOT STARTED'
    
    print(f'M{i}: {title}')
    print(f'    Range: Q{start} - Q{end} ({questions} questions)')
    print(f'    Completed: {completed}/{questions} ({progress}%)')
    print(f'    Status: {status}')
    print()

print('-' * 60)
print(f'TOTAL: {total_questions} questions defined in milestones')
print(f'COMPLETED: {total_completed}/{total_questions} ({round(total_completed/total_questions*100, 1) if total_questions > 0 else 0}%)')
"
}

# Verify page data and milestone assignment
verify_pages() {
    separator "📄 PAGE DATA & MILESTONE ASSIGNMENT"
    
    curl -s "$BASE_URL/api/pages" | python3 -c "
import json, sys

data = json.load(sys.stdin)
pages = data.get('pages', [])

print(f'Total Pages: {len(pages)}')
print('-' * 80)

# Milestone ranges
milestones = [
    {'name': 'M1', 'start': 1, 'end': 480},
    {'name': 'M2', 'start': 481, 'end': 960},
    {'name': 'M3', 'start': 961, 'end': 1440}
]

# Calculate cumulative and assign milestones
cum = 0
ms_stats = {m['name']: {'pages': 0, 'questions': 0, 'completed': 0} for m in milestones}
ms_stats['Beyond'] = {'pages': 0, 'questions': 0, 'completed': 0}

print(f'{'#':>3} | {'MS':>4} | {'Range':>15} | {'Total':>6} | {'Done':>6} | {'Page Name':<35}')
print('-' * 80)

for i, p in enumerate(pages, 1):
    page_start = cum + 1
    cum += p['total_questions']
    page_end = cum
    
    # Determine milestone
    ms_name = 'Beyond'
    for m in milestones:
        if page_end >= m['start'] and page_start <= m['end']:
            ms_name = m['name']
            break
    
    # Update stats
    ms_stats[ms_name]['pages'] += 1
    ms_stats[ms_name]['questions'] += p['total_questions']
    ms_stats[ms_name]['completed'] += p['completed_questions']
    
    # Truncate page name
    name = (p.get('page_name', 'N/A') or 'N/A')[:35]
    
    print(f'{i:>3} | {ms_name:>4} | Q{page_start:>5}-{page_end:<6} | {p[\"total_questions\"]:>6} | {p[\"completed_questions\"]:>6} | {name}')

print('-' * 80)
print()
print('Summary by Milestone:')
print('-' * 60)
for ms_name in ['M1', 'M2', 'M3', 'Beyond']:
    s = ms_stats[ms_name]
    if s['pages'] > 0:
        pct = round(s['completed']/s['questions']*100, 1) if s['questions'] > 0 else 0
        print(f'{ms_name}: {s[\"pages\"]} pages, {s[\"questions\"]} questions, {s[\"completed\"]} completed ({pct}%)')

print()
total_q = sum(p['total_questions'] for p in pages)
total_c = sum(p['completed_questions'] for p in pages)
print(f'TOTAL FROM PAGES: {total_q} questions, {total_c} completed ({round(total_c/total_q*100, 1) if total_q > 0 else 0}%)')
"
}

# Verify progress calculations
verify_progress() {
    separator "📊 PROGRESS CALCULATIONS"
    
    curl -s "$BASE_URL/api/progress" | python3 -c "
import json, sys

data = json.load(sys.stdin)

print('Progress API Response:')
print('-' * 50)

# Current milestone info
print(f'Current Milestone: {data.get(\"current_milestone_title\", \"N/A\")}')
print(f'  Range: Q{data.get(\"current_milestone_start\", \"?\")} - Q{data.get(\"current_milestone_end\", \"?\")}')
print(f'  Completed: {data.get(\"completed_questions\", 0)}/{data.get(\"total_questions\", 0)}')
print(f'  Progress: {data.get(\"progress_percentage\", 0)}%')
print()

# Overall progress
print('Overall Progress:')
print(f'  Completed: {data.get(\"overall_completed\", 0)}/{data.get(\"overall_total\", 0)}')
print(f'  Progress: {data.get(\"overall_progress_percentage\", 0)}%')
print()

# Previous milestone
if data.get('previous_milestone_exists'):
    print(f'Previous Milestone: {data.get(\"previous_milestone_title\", \"N/A\")}')
    print(f'  Progress: {data.get(\"previous_milestone_progress\", 0)}%')
    print()

# Validation
overall_completed = data.get('overall_completed', 0)
overall_total = data.get('overall_total', 0)
reported_pct = data.get('overall_progress_percentage', 0)
calculated_pct = round(overall_completed / overall_total * 100, 2) if overall_total > 0 else 0

print('-' * 50)
print('Validation:')
if abs(reported_pct - calculated_pct) < 0.1:
    print(f'✅ Progress calculation is CORRECT: {reported_pct}%')
else:
    print(f'❌ Progress mismatch! Reported: {reported_pct}%, Calculated: {calculated_pct}%')

if overall_completed == overall_total and reported_pct == 100:
    print('🎉 ALL MILESTONES COMPLETE!')
elif overall_completed < overall_total:
    remaining = overall_total - overall_completed
    print(f'📝 Remaining: {remaining} questions to complete all milestones')
"
}

# Verify milestone boundaries (where 🎯 Target Reached! should appear)
verify_milestone_boundaries() {
    separator "🎯 MILESTONE BOUNDARY DETECTION"
    
    curl -s "$BASE_URL/api/pages" | python3 -c "
import json, sys

data = json.load(sys.stdin)
pages = data.get('pages', [])

milestones = [
    {'name': 'M1', 'end': 480, 'title': 'Milestone 1'},
    {'name': 'M2', 'end': 960, 'title': 'Milestone 2'},
    {'name': 'M3', 'end': 1440, 'title': 'Milestone 3'}
]

print('Pages that cross milestone boundaries:')
print('(These pages should show \"🎯 Target Reached!\" decoration)')
print('-' * 70)

cum = 0
for i, p in enumerate(pages, 1):
    page_start = cum + 1
    cum += p['total_questions']
    page_end = cum
    
    for ms in milestones:
        if page_start <= ms['end'] and page_end >= ms['end']:
            name = (p.get('page_name', 'N/A') or 'N/A')[:40]
            print(f'Page {i}: {name}')
            print(f'    Range: Q{page_start} - Q{page_end}')
            print(f'    Crosses: {ms[\"name\"]} boundary (Q{ms[\"end\"]})')
            print(f'    → Should show: 🎯 {ms[\"title\"]} Target Reached!')
            print()

print('-' * 70)
print('If a page crosses a milestone boundary, the dashboard table should')
print('display a \"🎯 Target Reached!\" indicator in that row.')
"
}

# Verify page ordering (oldest first)
verify_page_ordering() {
    separator "📅 PAGE ORDERING (Creation Date)"
    
    curl -s "$BASE_URL/api/pages" | python3 -c "
import json, sys
from datetime import datetime

data = json.load(sys.stdin)
pages = data.get('pages', [])

print('First 10 pages (should be oldest):')
print('-' * 70)

for i, p in enumerate(pages[:10], 1):
    name = (p.get('page_name', 'N/A') or 'N/A')[:35]
    created = p.get('created_at', 'N/A')
    if created and created != 'N/A':
        created = created[:19].replace('T', ' ')
    print(f'{i:>2}. {name:<35} | Created: {created}')

print()
print('Last 5 pages (should be newest):')
print('-' * 70)

for i, p in enumerate(pages[-5:], len(pages)-4):
    name = (p.get('page_name', 'N/A') or 'N/A')[:35]
    created = p.get('created_at', 'N/A')
    if created and created != 'N/A':
        created = created[:19].replace('T', ' ')
    print(f'{i:>2}. {name:<35} | Created: {created}')

# Check if properly sorted
print()
print('-' * 70)
dates = [p.get('created_at', '') for p in pages if p.get('created_at')]
if dates:
    is_sorted = all(dates[i] <= dates[i+1] for i in range(len(dates)-1))
    if is_sorted:
        print('✅ Pages are correctly sorted by creation date (oldest first)')
    else:
        print('❌ Pages are NOT sorted correctly by creation date')
else:
    print('⚠️ No creation dates found in pages')
"
}

# Verify overall vs milestone totals
verify_totals_match() {
    separator "🔢 TOTALS VERIFICATION"
    
    echo -e "${CYAN}Comparing milestone definitions vs page data...${NC}"
    echo ""
    
    # Get milestone totals
    MS_TOTAL=$(curl -s "$BASE_URL/api/public/milestones" | python3 -c "
import json, sys
data = json.load(sys.stdin)
milestones = data.get('milestones', [])
total = 0
for m in milestones:
    start = m.get('question_range_start', m.get('start_question', 0))
    end = m.get('question_range_end', m.get('end_question', 0))
    total += (end - start + 1)
print(total)
")
    
    # Get page totals
    PAGE_DATA=$(curl -s "$BASE_URL/api/pages" | python3 -c "
import json, sys
data = json.load(sys.stdin)
pages = data.get('pages', [])
total = sum(p['total_questions'] for p in pages)
completed = sum(p['completed_questions'] for p in pages)
print(f'{total},{completed}')
")
    
    PAGE_TOTAL=$(echo $PAGE_DATA | cut -d',' -f1)
    PAGE_COMPLETED=$(echo $PAGE_DATA | cut -d',' -f2)
    
    echo "Milestone Target Total: $MS_TOTAL questions"
    echo "Page Data Total:        $PAGE_TOTAL questions"
    echo "Completed (from pages): $PAGE_COMPLETED questions"
    echo ""
    
    if [ "$PAGE_TOTAL" -eq "$MS_TOTAL" ]; then
        echo -e "${GREEN}✅ Page total MATCHES milestone target${NC}"
    else
        DIFF=$((MS_TOTAL - PAGE_TOTAL))
        echo -e "${YELLOW}⚠️ Page total ($PAGE_TOTAL) does NOT match milestone target ($MS_TOTAL)${NC}"
        echo -e "${YELLOW}   Difference: $DIFF questions${NC}"
        echo ""
        echo "This means:"
        if [ "$DIFF" -gt 0 ]; then
            echo "  - You need $DIFF more questions in pages to fill all milestones"
        else
            echo "  - You have $((-DIFF)) extra questions beyond milestone definitions"
        fi
    fi
    
    echo ""
    # Calculate correct progress
    CORRECT_PROGRESS=$(python3 -c "print(round($PAGE_COMPLETED / $MS_TOTAL * 100, 2))")
    echo "Correct Overall Progress: $PAGE_COMPLETED / $MS_TOTAL = $CORRECT_PROGRESS%"
}

# Run all checks
main() {
    clear
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║         MILESTONE TRACKER - SYSTEM VERIFICATION SCRIPT           ║"
    echo "║                        $(date '+%Y-%m-%d %H:%M:%S')                        ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_server
    check_api_health
    verify_milestones
    verify_pages
    verify_progress
    verify_milestone_boundaries
    verify_page_ordering
    verify_totals_match
    
    separator "✨ VERIFICATION COMPLETE"
    echo -e "${GREEN}All checks completed. Review the output above for any issues.${NC}"
    echo ""
    echo "Quick Commands:"
    echo "  ./verify_system.sh              - Run all checks"
    echo "  ./verify_system.sh | grep '❌'  - Show only failures"
    echo "  ./verify_system.sh | grep '✅'  - Show only successes"
    echo ""
}

# Run main function
main "$@"

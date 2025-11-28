#!/usr/bin/env python3
"""
Export pages data to CSV with milestone assignment
Run: python export_pages.py
"""

import requests
import csv
from datetime import datetime

# API endpoints
BASE_URL = "https://milestone-tracker-1lj5.onrender.com"
# BASE_URL = "http://localhost:8000"  # For local testing

def fetch_data():
    """Fetch pages and milestones from API"""
    pages_response = requests.get(f"{BASE_URL}/api/pages")
    milestones_response = requests.get(f"{BASE_URL}/api/public/milestones")
    
    pages = pages_response.json().get('pages', [])
    milestones = milestones_response.json().get('milestones', [])
    
    return pages, milestones

def assign_milestone(cumulative_end, milestones):
    """Determine which milestone a page belongs to based on cumulative question count"""
    for m in milestones:
        start = m.get('question_range_start', m.get('start_question', 0))
        end = m.get('question_range_end', m.get('end_question', 0))
        if cumulative_end <= end:
            milestone_num = m.get('milestone_number', 0)
            return f"M{milestone_num - 1}" if milestone_num > 1 else "M1"
    return "Beyond"

def export_to_csv(output_file="pages_export.csv"):
    """Export pages data to CSV"""
    
    print("🔄 Fetching data from API...")
    pages, milestones = fetch_data()
    
    # Sort milestones by start_question
    milestones.sort(key=lambda m: m.get('question_range_start', m.get('start_question', 0)))
    
    print(f"📊 Found {len(pages)} pages and {len(milestones)} milestones")
    
    # Prepare CSV data
    csv_data = []
    cumulative = 0
    
    for i, page in enumerate(pages, 1):
        page_start = cumulative + 1
        cumulative += page['total_questions']
        page_end = cumulative
        
        # Determine milestone
        milestone = assign_milestone(page_end, milestones)
        
        # Check for milestone boundary
        milestone_boundary = ""
        for m in milestones:
            m_end = m.get('question_range_end', m.get('end_question', 0))
            if page_start <= m_end <= page_end:
                ms_num = m.get('milestone_number', 0)
                ms_name = f"M{ms_num - 1}" if ms_num > 1 else "M1"
                milestone_boundary = f"🎯 {ms_name} Target Reached!"
                break
        
        # Build row
        row = {
            'S.NO.': i,
            'Milestone': milestone,
            'PAGE NAME': page.get('page_name', 'N/A'),
            'PAGE LINK': page.get('page_link', ''),
            'TOTAL': page.get('total_questions', 0),
            'Completed': page.get('completed_questions', 0),
            'Remaining': page.get('remaining_questions', 0),
            'Cumulative': f"Q{page_start}-Q{page_end}",
            'Subject': page.get('subject', 'N/A'),
            'Year': page.get('year', 'N/A'),
            'Status': page.get('status', 'N/A'),
            'Progress %': page.get('progress_percentage', 0),
            'Milestone Boundary': milestone_boundary
        }
        csv_data.append(row)
    
    # Write to CSV
    if csv_data:
        fieldnames = list(csv_data[0].keys())
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_data)
        
        print(f"✅ Exported to {output_file}")
        
        # Print summary
        total_questions = sum(row['TOTAL'] for row in csv_data)
        total_completed = sum(row['Completed'] for row in csv_data)
        
        print(f"\n📈 Summary:")
        print(f"   Total Pages: {len(csv_data)}")
        print(f"   Total Questions: {total_questions}")
        print(f"   Completed: {total_completed}")
        print(f"   Progress: {round(total_completed/total_questions*100, 2) if total_questions > 0 else 0}%")
        
        # Milestone breakdown
        print(f"\n🎯 By Milestone:")
        milestone_stats = {}
        for row in csv_data:
            ms = row['Milestone']
            if ms not in milestone_stats:
                milestone_stats[ms] = {'pages': 0, 'total': 0, 'completed': 0}
            milestone_stats[ms]['pages'] += 1
            milestone_stats[ms]['total'] += row['TOTAL']
            milestone_stats[ms]['completed'] += row['Completed']
        
        for ms, stats in sorted(milestone_stats.items()):
            pct = round(stats['completed']/stats['total']*100, 1) if stats['total'] > 0 else 0
            print(f"   {ms}: {stats['pages']} pages, {stats['completed']}/{stats['total']} ({pct}%)")
    
    return output_file

if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"pages_export_{timestamp}.csv"
    export_to_csv(output_file)

import asyncio
import requests
import json

# Real project data - IITian Academy Freelancer Project
real_pages = [
    {
        "page_name": "JEE Main 27 June 2022 Paper Shift 2 - Chemistry",
        "page_link": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_chemistry/",
        "total_questions": 30,
        "completed_questions": 30,
        "status": "Completed"
    },
    {
        "page_name": "JEE Main 27 June 2022 Paper Shift 2 - Maths",
        "page_link": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_maths/",
        "total_questions": 30,
        "completed_questions": 30,
        "status": "Completed"
    },
    {
        "page_name": "JEE Main 27 June 2022 Paper Shift 2 - Physics",
        "page_link": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_physics/",
        "total_questions": 30,
        "completed_questions": 30,
        "status": "Completed"
    },
    {
        "page_name": "AP Stats 2018 Practice Paper MCQs",
        "page_link": "https://www.iitianacademy.com/ap_stats_2018_practice_paper_mcqs/",
        "total_questions": 40,
        "completed_questions": 40,
        "status": "Completed"
    },
    {
        "page_name": "AP Stats 2017 MCQs",
        "page_link": "https://www.iitianacademy.com/ap_stats_2017_mcqs/",
        "total_questions": 40,
        "completed_questions": 40,
        "status": "Completed"
    },
    {
        "page_name": "AP Stats 2016 MCQs",
        "page_link": "https://www.iitianacademy.com/ap_stats_2016_mcqs/",
        "total_questions": 40,
        "completed_questions": 40,
        "status": "Completed"
    },
    {
        "page_name": "AP Stats 2015 Practice Paper MCQ",
        "page_link": "https://www.iitianacademy.com/ap_stats_2015_practice_paper_mcq/",
        "total_questions": 40,
        "completed_questions": 40,
        "status": "Completed"
    },
    {
        "page_name": "AP Stats 2015 Multiple Choice",
        "page_link": "https://www.iitianacademy.com/ap_stats_2015_multiple_choice/",
        "total_questions": 40,
        "completed_questions": 0,
        "status": "Pending"
    }
]

async def add_sample_data():
    """Add sample data to test the system"""
    api_key = "IITian_Academy_Admin_2024_SecureKey_Ticky7065"
    
    for page_data in real_pages:
        try:
            response = requests.post(
                "http://localhost:8000/api/add_page",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": api_key
                },
                json=page_data
            )
            
            if response.status_code == 201:
                print(f"✅ Added: {page_data['page_name']}")
            else:
                print(f"❌ Failed to add: {page_data['page_name']} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error adding {page_data['page_name']}: {e}")

if __name__ == "__main__":
    print("🚀 Adding real project data...")
    asyncio.run(add_sample_data())
    print("✅ Real data addition completed!")
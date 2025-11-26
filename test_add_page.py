import requests
import json

# Test data addition
data = {
    "page_name": "JEE Main 27 June 2022 Paper Shift 2 - Chemistry",
    "page_link": "https://www.iitianacademy.com/jee-main-27-june-2022-paper-shift-2_chemistry/",
    "total_questions": 30
}

headers = {
    "Content-Type": "application/json",
    "X-API-Key": "IITian_Academy_Admin_2024_SecureKey_Ticky7065"
}

try:
    response = requests.post(
        "http://localhost:8000/api/add_page",
        headers=headers,
        json=data
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        print("✅ Successfully added page!")
    else:
        print("❌ Failed to add page")
        
except Exception as e:
    print(f"Error: {e}")
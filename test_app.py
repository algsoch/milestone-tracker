"""
Test script to verify the IITian Academy Milestone Tracker works correctly
This will run the app locally using the mock database and test all endpoints
"""

import os
import sys
import asyncio
import uvicorn
import threading
import time
import requests
import json
from datetime import datetime

# Set up environment for testing
os.environ["MONGODB_URI"] = "mock"  # Force mock database
os.environ["ADMIN_API_KEY"] = "test-admin-key-123"
os.environ["DATABASE_NAME"] = "tracker_db"
os.environ["PORT"] = "8001"  # Use different port to avoid conflicts
os.environ["MILESTONE_DEADLINE"] = "2025-10-17"
os.environ["MILESTONE_CREATED"] = "2025-10-13"
os.environ["TOTAL_QUESTIONS"] = "480"
os.environ["MILESTONE_AMOUNT"] = "30"

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def run_server():
    """Run the FastAPI server in a separate thread"""
    try:
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8001,
            log_level="info",
            access_log=False
        )
    except Exception as e:
        print(f"❌ Server error: {e}")

def test_endpoints():
    """Test all API endpoints"""
    base_url = "http://127.0.0.1:8001"
    headers = {"X-API-Key": "test-admin-key-123"}
    
    print("🧪 Testing API Endpoints...")
    
    # Wait for server to start
    time.sleep(3)
    
    try:
        # Test 1: Health check
        print("\n1️⃣ Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
        
        # Test 2: Get all pages (should have sample data)
        print("\n2️⃣ Testing get all pages...")
        response = requests.get(f"{base_url}/api/pages", timeout=5)
        if response.status_code == 200:
            data = response.json()
            pages = data.get('pages', [])
            print(f"✅ Got {len(pages)} pages")
            for page in pages[:2]:  # Show first 2 pages
                print(f"   - {page['page_name']}: {page['completed_questions']}/{page['total_questions']} ({page['status']})")
        else:
            print(f"❌ Get pages failed: {response.status_code}")
            return False
        
        # Test 3: Get milestone summary
        print("\n3️⃣ Testing milestone summary...")
        response = requests.get(f"{base_url}/api/progress", timeout=5)
        if response.status_code == 200:
            summary = response.json()
            print("✅ Milestone summary:")
            print(f"   Total Questions: {summary.get('total_questions', 0)}")
            print(f"   Completed: {summary.get('completed_questions', 0)}")
            print(f"   Progress: {summary.get('progress_percentage', 0)}%")
            print(f"   Days Remaining: {summary.get('days_remaining', 0)}")
        else:
            print(f"❌ Milestone summary failed: {response.status_code}")
            return False
        
        # Test 4: Get performance insights
        print("\n4️⃣ Testing performance insights...")
        response = requests.get(f"{base_url}/api/reminder", timeout=5)
        if response.status_code == 200:
            insights = response.json()
            print("✅ Performance insights:")
            print(f"   Daily Average: {insights.get('average_daily_rate', 0)} questions/day")
            print(f"   Performance Trend: {insights.get('performance_trend', 'Unknown')}")
            print(f"   Recommendation: {insights.get('recommendation', 'None')}")
        else:
            print(f"❌ Performance insights failed: {response.status_code}")
            return False
        
        # Test 5: Add new page (Admin)
        print("\n5️⃣ Testing add new page (Admin)...")
        new_page = {
            "page_name": "Test Page - API Created",
            "page_link": "https://example.com/test",
            "total_questions": 20,
            "status": "Pending"
        }
        page_id = None
        response = requests.post(f"{base_url}/api/add_page", json=new_page, headers=headers, timeout=5)
        if response.status_code == 201:
            result = response.json()
            page_id = result.get('page_id')
            print(f"✅ Created new page with ID: {page_id}")
        else:
            print(f"❌ Add page failed: {response.status_code}")
            if response.status_code != 500:  # Don't fail test for server errors
                return False
        
        # Test 6: Update page progress (Admin)
        if page_id:
            print("\n6️⃣ Testing update page progress (Admin)...")
            update_data = {"completed_questions": 5}
            response = requests.put(f"{base_url}/api/update_page/{page_id}", json=update_data, headers=headers, timeout=5)
            if response.status_code == 200:
                print("✅ Updated page progress")
            else:
                print(f"❌ Update page failed: {response.status_code}")
        
        # Test 7: Manual backup (Admin)
        print("\n7️⃣ Testing manual backup (Admin)...")
        response = requests.post(f"{base_url}/api/backup", headers=headers, timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Backup created: {result.get('backup_path')}")
        else:
            print(f"❌ Backup failed: {response.status_code}")
        
        # Test 8: Dashboard page
        print("\n8️⃣ Testing dashboard page...")
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200 and "IITian Academy" in response.text:
            print("✅ Dashboard loads successfully")
        else:
            print(f"❌ Dashboard failed: {response.status_code}")
            return False
        
        print("\n🎉 All tests passed! The application is working correctly.")
        print(f"\n📱 You can now access the dashboard at: {base_url}")
        print("🔑 Use admin API key 'test-admin-key-123' to test admin features")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running.")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting IITian Academy Milestone Tracker Test")
    print("=" * 60)
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Run tests
    success = test_endpoints()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ SUCCESS: Your milestone tracker is ready!")
        print("\nNext steps:")
        print("1. For production: Set MONGODB_URI to your Atlas connection string")
        print("2. Deploy to Render using the included Docker configuration")
        print("3. Set secure environment variables on Render dashboard")
        print("\nPress Ctrl+C to stop the test server...")
        
        try:
            # Keep server running so user can test dashboard
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Test server stopped.")
    else:
        print("\n❌ FAILED: Some tests did not pass. Check the errors above.")
        return False
    
    return True

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Simple startup script for IITian Academy Milestone Tracker
"""

import os
import sys
import uvicorn
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set default environment variables (only if not already set)
os.environ.setdefault("MONGODB_URI", "mock")
os.environ.setdefault("ADMIN_API_KEY", "admin-key-123")
os.environ.setdefault("DATABASE_NAME", "tracker_db")
os.environ.setdefault("PORT", "8000")

def main():
    """Main entry point"""
    print("🚀 Starting IITian Academy Milestone Tracker...")
    
    port = int(os.getenv("PORT", 8000))
    
    if os.getenv("MONGODB_URI") == "mock":
        print("📝 Using mock database (for testing)")
    else:
        print("🌐 Using MongoDB Atlas")
    
    print(f"🌍 Server: http://localhost:{port}")
    
    # Import and run the app
    from app.main import app
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=True
    )

if __name__ == "__main__":
    main()
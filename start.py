#!/usr/bin/env python3
"""
IITian Academy Milestone Tracker - Simple Startup Script
Fixed import issues for direct execution
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def print_banner():
    """Print application banner"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                 🎓 IITian Academy Milestone Tracker         ║
║                Professional Project Management               ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_environment_file():
    """Check if .env file exists and create from template if needed"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("📄 Creating .env file from template...")
            with open(env_example, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            print("⚠️  Please edit .env file with your actual values before running the server")
            return False
        else:
            print("❌ Error: .env.example file not found")
            return False
    
    print("✅ Environment file found")
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ["backups", "static", "templates"]
    for dir_name in directories:
        Path(dir_name).mkdir(exist_ok=True)
    print("✅ Application directories ready")

def validate_env_variables():
    """Validate required environment variables"""
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = [
        "MONGODB_URI",
        "ADMIN_API_KEY",
        "DATABASE_NAME"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please update your .env file with the correct values")
        return False
    
    print("✅ Environment variables validated")
    return True

def get_server_config():
    """Get server configuration from environment"""
    from dotenv import load_dotenv
    load_dotenv()
    
    return {
        "host": os.getenv("HOST", "127.0.0.1"),
        "port": int(os.getenv("PORT", 8000)),
        "reload": True,
        "log_level": "info"
    }

def start_server(config):
    """Start the FastAPI server"""
    print(f"🚀 Starting server at http://{config['host']}:{config['port']}")
    print("📊 Dashboard: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    print("\n🔑 Admin Panel: Click 'Admin Panel' button on dashboard")
    print("📱 Public View: Default dashboard view for clients")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host=config["host"],
            port=config["port"],
            reload=config["reload"],
            log_level=config["log_level"]
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

def main():
    """Main startup function"""
    print_banner()
    
    # Check system requirements
    check_python_version()
    
    # Setup environment
    if not check_environment_file():
        return
    
    # Install dependencies
    if not install_dependencies():
        return
    
    # Create directories
    create_directories()
    
    # Validate configuration
    if not validate_env_variables():
        return
    
    # Get server configuration
    config = get_server_config()
    
    # Start server
    start_server(config)

if __name__ == "__main__":
    main()
@echo off
REM IITian Academy Milestone Tracker - Windows Quick Start Script

echo.
echo 🎓 IITian Academy Milestone Tracker - Quick Start
echo =================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker is available
    set DOCKER_AVAILABLE=true
) else (
    echo ⚠️  Docker not found - will use local Python setup
    set DOCKER_AVAILABLE=false
)

echo.
echo Choose setup method:
echo 1. Docker (Recommended for production)
echo 2. Local Python setup (For development)
echo.

set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    if "%DOCKER_AVAILABLE%"=="true" (
        echo 🐳 Setting up with Docker...
        
        REM Check if .env exists
        if not exist .env (
            echo 📝 Creating .env file from template...
            copy .env.example .env
            echo.
            echo ⚠️  Please edit .env file with your MongoDB URI and API key before continuing.
            echo Press any key to continue after editing .env...
            pause >nul
        )
        
        REM Build and run with Docker Compose
        echo 🔨 Building Docker image...
        docker-compose build
        
        echo 🚀 Starting application...
        docker-compose up -d
        
        echo.
        echo ✅ Application is starting up!
        echo 📊 Dashboard: http://localhost:8000
        echo 📚 API Docs: http://localhost:8000/docs
        echo.
        echo To stop: docker-compose down
        echo To view logs: docker-compose logs -f
        pause
        
    ) else (
        echo ❌ Docker is required for this option but not available.
        pause
        exit /b 1
    )
) else if "%choice%"=="2" (
    echo 🐍 Setting up with local Python...
    
    REM Create virtual environment if it doesn't exist
    if not exist venv (
        echo 📦 Creating virtual environment...
        python -m venv venv
    )
    
    REM Activate virtual environment
    echo 🔧 Activating virtual environment...
    call venv\Scripts\activate.bat
    
    REM Install dependencies
    echo 📥 Installing dependencies...
    pip install -r requirements.txt
    
    REM Check if .env exists
    if not exist .env (
        echo 📝 Creating .env file from template...
        copy .env.example .env
        echo.
        echo ⚠️  Please edit .env file with your MongoDB URI and API key.
        echo Press any key to continue after editing .env...
        pause >nul
    )
    
    REM Create backups directory
    if not exist backups mkdir backups
    
    REM Start the application
    echo 🚀 Starting application...
    echo.
    echo ✅ Application starting!
    echo 📊 Dashboard: http://localhost:8000
    echo 📚 API Docs: http://localhost:8000/docs
    echo.
    echo Press Ctrl+C to stop the application
    echo.
    
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    
) else (
    echo ❌ Invalid choice. Please run the script again.
    pause
    exit /b 1
)

pause
#!/bin/bash

# IITian Academy Milestone Tracker - Quick Start Script
# This script helps you set up and run the tracker locally

set -e

echo "🎓 IITian Academy Milestone Tracker - Quick Start"
echo "================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found - will use local Python setup"
    DOCKER_AVAILABLE=false
fi

echo ""
echo "Choose setup method:"
echo "1. Docker (Recommended for production)"
echo "2. Local Python setup (For development)"
echo ""

read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        if [ "$DOCKER_AVAILABLE" = true ]; then
            echo "🐳 Setting up with Docker..."
            
            # Check if .env exists
            if [ ! -f .env ]; then
                echo "📝 Creating .env file from template..."
                cp .env.example .env
                echo ""
                echo "⚠️  Please edit .env file with your MongoDB URI and API key before continuing."
                echo "Press any key to continue after editing .env..."
                read -n 1
            fi
            
            # Build and run with Docker Compose
            echo "🔨 Building Docker image..."
            docker-compose build
            
            echo "🚀 Starting application..."
            docker-compose up -d
            
            echo ""
            echo "✅ Application is starting up!"
            echo "📊 Dashboard: http://localhost:8000"
            echo "📚 API Docs: http://localhost:8000/docs"
            echo ""
            echo "To stop: docker-compose down"
            echo "To view logs: docker-compose logs -f"
            
        else
            echo "❌ Docker is required for this option but not available."
            exit 1
        fi
        ;;
    2)
        echo "🐍 Setting up with local Python..."
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            echo "📦 Creating virtual environment..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        echo "🔧 Activating virtual environment..."
        source venv/bin/activate
        
        # Install dependencies
        echo "📥 Installing dependencies..."
        pip install -r requirements.txt
        
        # Check if .env exists
        if [ ! -f .env ]; then
            echo "📝 Creating .env file from template..."
            cp .env.example .env
            echo ""
            echo "⚠️  Please edit .env file with your MongoDB URI and API key."
            echo "Press any key to continue after editing .env..."
            read -n 1
        fi
        
        # Create backups directory
        mkdir -p backups
        
        # Start the application
        echo "🚀 Starting application..."
        echo ""
        echo "✅ Application starting!"
        echo "📊 Dashboard: http://localhost:8000"
        echo "📚 API Docs: http://localhost:8000/docs"
        echo ""
        echo "Press Ctrl+C to stop the application"
        echo ""
        
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac
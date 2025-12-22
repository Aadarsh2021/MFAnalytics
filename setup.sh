#!/bin/bash

# Complete setup script for Portfolio Optimization Platform

echo "🚀 Portfolio Optimization Platform - Complete Setup"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo ""
echo "Step 1: Building Docker containers..."
docker-compose build

echo ""
echo "Step 2: Starting services..."
docker-compose up -d

echo ""
echo "Step 3: Waiting for database to be ready..."
sleep 10

echo ""
echo "Step 4: Initializing database..."
docker-compose exec backend python init_db.py

echo ""
echo "Step 5: Seeding sample data..."
docker-compose exec backend python seed_data.py

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/api/docs"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"

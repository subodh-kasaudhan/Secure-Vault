#!/bin/bash

# Bash script to start Docker in development mode
echo "Starting Secure Vault in Development Mode..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.dev.yml up --build

echo ""
echo "Development server started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the servers"


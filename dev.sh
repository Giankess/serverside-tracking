#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is installed
if ! command_exists docker; then
    echo -e "${YELLOW}Docker not found. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command_exists docker-compose; then
    echo -e "${YELLOW}Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi

# Start Redis using Docker Compose
echo -e "${GREEN}Starting Redis...${NC}"
docker-compose up -d redis

# Wait for Redis to be ready
echo -e "${GREEN}Waiting for Redis to be ready...${NC}"
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}Redis is ready!${NC}"

# Start the Next.js development server
echo -e "${GREEN}Starting Next.js development server...${NC}"
npm run dev

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    docker-compose down
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep the script running
wait 
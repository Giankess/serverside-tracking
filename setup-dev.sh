#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up development environment...${NC}"

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
    echo -e "${YELLOW}NVM not found. Installing NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install and use Node.js LTS version
echo -e "${GREEN}Installing Node.js LTS version...${NC}"
nvm install --lts
nvm use --lts

# Install project dependencies
echo -e "${GREEN}Installing project dependencies...${NC}"
npm install

# Create necessary directories
echo -e "${GREEN}Creating necessary directories...${NC}"
mkdir -p src/pages src/components src/styles src/utils src/hooks src/data

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo -e "${GREEN}Creating .env.local file...${NC}"
    cat > .env.local << EOL
NEXT_PUBLIC_GTM_ID=your_gtm_id
GA4_MEASUREMENT_ID=your_measurement_id
GA4_API_SECRET=your_api_secret
REDIS_URL=redis://localhost:6379
NODE_ENV=development
EOL
fi

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo -e "${GREEN}Creating .gitignore file...${NC}"
    cat > .gitignore << EOL
# Node
node_modules/
.next/
out/
dist/
.env
.env.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage/
.DS_Store

# Logs
logs
*.log

# OS
Thumbs.db
EOL
fi

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}Redis not found. Please install Redis:${NC}"
    echo "Windows: https://github.com/microsoftarchive/redis/releases"
    echo "macOS: brew install redis"
    echo "Linux: sudo apt-get install redis-server"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update .env.local with your actual tracking IDs"
echo "2. Start Redis server"
echo "3. Run 'npm run dev' to start the development server" 
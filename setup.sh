#!/bin/bash

# AI Support Chatbot - Setup Script
# Automates environment setup and validation

set -e

echo "🚀 AI Support Chatbot - Setup Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current: $(node --version)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
echo "📦 Checking npm..."
npm --version > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ npm $(npm --version)${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo ""
echo "📥 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push --accept-data-loss

echo ""
echo "🔧 Checking environment variables..."

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env created from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and add your API keys${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

echo ""
echo "🔑 Checking required environment variables..."

# Check for OpenAI key
if grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${GREEN}✅ OPENAI_API_KEY configured${NC}"
else
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set${NC}"
    echo "   Get your key from: https://platform.openai.com/api-keys"
fi

# Check for Shopify credentials
if grep -q "SHOPIFY_API_KEY=" .env 2>/dev/null && [ "$(grep SHOPIFY_API_KEY .env | cut -d'=' -f2)" != "" ]; then
    echo -e "${GREEN}✅ SHOPIFY_API_KEY configured${NC}"
else
    echo -e "${YELLOW}⚠️  SHOPIFY_API_KEY not set${NC}"
    echo "   Get from: https://partners.shopify.com"
fi

if grep -q "SHOPIFY_API_SECRET=" .env 2>/dev/null && [ "$(grep SHOPIFY_API_SECRET .env | cut -d'=' -f2)" != "" ]; then
    echo -e "${GREEN}✅ SHOPIFY_API_SECRET configured${NC}"
else
    echo -e "${YELLOW}⚠️  SHOPIFY_API_SECRET not set${NC}"
fi

echo ""
echo "🧪 Running health checks..."

# Start server in background for testing
echo "Starting server..."
npm run dev:server > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

# Health check
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

# Socket.IO check
if curl -s http://localhost:3000/socket/status | grep -q "status"; then
    echo -e "${GREEN}✅ Socket.IO check passed${NC}"
else
    echo -e "${RED}❌ Socket.IO check failed${NC}"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "For detailed testing, see TESTING_GUIDE.md"
echo ""

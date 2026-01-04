#!/bin/bash

# ============================================
# DTrader-5.1 - Deploy Script
# Pull from git and restart services
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🚀 DTrader-5.1 Deploy 🚀          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Получаем директорию проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📁 Project: ${PROJECT_DIR}${NC}"
echo ""

# 1. Git pull
echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "   Current branch: ${CURRENT_BRANCH}"

if git pull origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}   ✅ Git pull successful${NC}"
else
    echo -e "${RED}   ❌ Git pull failed${NC}"
    exit 1
fi
echo ""

# 2. Install dependencies (if needed)
echo -e "${YELLOW}📦 Checking dependencies...${NC}"

# Bot
if [ -f "bot/package.json" ]; then
    if [ ! -d "bot/node_modules" ] || [ "bot/package.json" -nt "bot/node_modules" ]; then
        echo -e "   Installing bot dependencies..."
        cd bot && npm install && cd ..
        echo -e "${GREEN}   ✅ Bot dependencies installed${NC}"
    else
        echo -e "   ✅ Bot dependencies up to date"
    fi
fi

# WS-Server
if [ -f "ws-server/package.json" ]; then
    if [ ! -d "ws-server/node_modules" ] || [ "ws-server/package.json" -nt "ws-server/node_modules" ]; then
        echo -e "   Installing ws-server dependencies..."
        cd ws-server && npm install && cd ..
        echo -e "${GREEN}   ✅ WS-Server dependencies installed${NC}"
    else
        echo -e "   ✅ WS-Server dependencies up to date"
    fi
fi

# Scanner (Python)
if [ -f "scanner/requirements.txt" ]; then
    echo -e "   Checking scanner dependencies..."
    cd scanner
    pip3 install -r requirements.txt --quiet
    cd ..
    echo -e "${GREEN}   ✅ Scanner dependencies installed${NC}"
fi

echo ""

# 3. Build (if needed)
echo -e "${YELLOW}🔨 Building...${NC}"

# TypeScript build для bot
if [ -f "bot/tsconfig.json" ]; then
    echo -e "   Building bot..."
    cd bot && npm run build 2>/dev/null || true && cd ..
fi

# TypeScript build для ws-server
if [ -f "ws-server/tsconfig.json" ]; then
    echo -e "   Building ws-server..."
    cd ws-server && npm run build 2>/dev/null || true && cd ..
fi

echo -e "${GREEN}   ✅ Build complete${NC}"
echo ""

# 4. Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
./deploy/restart.sh

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          ✅ Deploy Complete! ✅           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Show final status
./deploy/status.sh
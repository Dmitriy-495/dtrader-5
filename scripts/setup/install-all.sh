#!/bin/bash

# ============================================
# Install All Dependencies
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📦 Установка зависимостей для всех сервисов...${NC}"
echo ""

# Bot (Node.js + TypeScript)
if [ -d "bot" ]; then
    echo -e "${YELLOW}📦 Bot (Node.js + TypeScript)...${NC}"
    cd bot
    npm install
    cd ..
    echo -e "${GREEN}✅ Bot dependencies installed${NC}"
    echo ""
fi

# WS-Server (Node.js + TypeScript)
if [ -d "ws-server" ]; then
    echo -e "${YELLOW}📦 WS-Server (Node.js + TypeScript)...${NC}"
    cd ws-server
    npm install
    cd ..
    echo -e "${GREEN}✅ WS-Server dependencies installed${NC}"
    echo ""
fi

# Strategy (Python)
if [ -d "strategy" ]; then
    echo -e "${YELLOW}📦 Strategy (Python)...${NC}"
    cd strategy
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
    fi
    cd ..
    echo -e "${GREEN}✅ Strategy dependencies installed${NC}"
    echo ""
fi

# Trader (Python)
if [ -d "trader" ]; then
    echo -e "${YELLOW}📦 Trader (Python)...${NC}"
    cd trader
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
    fi
    cd ..
    echo -e "${GREEN}✅ Trader dependencies installed${NC}"
    echo ""
fi

# Risk Manager (Python)
if [ -d "risk-manager" ]; then
    echo -e "${YELLOW}📦 Risk Manager (Python)...${NC}"
    cd risk-manager
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
    fi
    cd ..
    echo -e "${GREEN}✅ Risk Manager dependencies installed${NC}"
    echo ""
fi

# Shared Libraries
echo -e "${YELLOW}📦 Shared Libraries...${NC}"

# TypeScript shared lib
if [ -d "shared/lib/typescript" ]; then
    cd shared/lib/typescript
    npm install
    npm run build
    cd ../../..
    echo -e "${GREEN}✅ TypeScript shared lib built${NC}"
fi

# Python shared lib
if [ -d "shared/lib/python" ]; then
    cd shared/lib/python
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
    fi
    cd ../../..
    echo -e "${GREEN}✅ Python shared lib installed${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ ВСЕ ЗАВИСИМОСТИ УСТАНОВЛЕНЫ! ✅                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"

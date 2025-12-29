#!/bin/bash

clear

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping all DTrader-5.1 instances...${NC}"
echo ""

# Убиваем процессы
pkill -9 -f "ts-node.*bot/src/app.ts" 2>/dev/null
pkill -9 -f "ts-node.*ws-server/src/app.ts" 2>/dev/null
pkill -9 -f "node.*ws-client/src/client.js" 2>/dev/null

sleep 1

# Проверяем
REMAINING=$(ps aux | grep -E "(ts-node.*app\.ts|node.*client\.js)" | grep -v grep | wc -l)

if [ "$REMAINING" -gt 0 ]; then
  echo -e "${RED}⚠️  Warning: $REMAINING processes still running${NC}"
  ps aux | grep -E "(ts-node|node.*client\.js)" | grep -v grep
else
  echo -e "${GREEN}✅ All instances stopped${NC}"
fi

echo ""

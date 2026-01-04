#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${RED}💀 KILLING ALL DTRADER PROCESSES 💀${NC}"
echo ""

# Показываем что будем убивать
echo -e "${YELLOW}Processes to kill:${NC}"
ps aux | grep -E "ts-node|node.*client|nodemon" | grep -v grep | awk '{print "   PID " $2 " - " $11 " " $12 " " $13}'

echo ""
read -p "Kill all these processes? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Killing processes...${NC}"

# Убиваем всё связанное с DTrader
pkill -9 -f "ts-node.*src/app.ts"
pkill -9 -f "node.*src/client.js"
pkill -9 -f "nodemon"
pkill -9 -f "sh -c ts-node"
pkill -9 -f "sh -c node src/client"

sleep 1

# Проверяем что осталось
REMAINING=$(ps aux | grep -E "ts-node|node.*client|nodemon" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✅ All processes killed!${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: $REMAINING process(es) still running${NC}"
    ps aux | grep -E "ts-node|node.*client|nodemon" | grep -v grep
    echo ""
    echo -e "${RED}Use nuclear option:${NC}"
    echo -e "   killall -9 node ts-node nodemon"
fi

echo ""
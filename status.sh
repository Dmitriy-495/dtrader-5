#!/bin/bash

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   📊 DTrader-5.1 Process Status 📊       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Ищем процессы
BOT=$(ps aux | grep "ts-node.*bot/src/app.ts" | grep -v grep)
WS_SERVER=$(ps aux | grep "ts-node.*ws-server/src/app.ts" | grep -v grep)
WS_CLIENT=$(ps aux | grep "node.*ws-client/src/client.js" | grep -v grep)

TOTAL=0

if [ ! -z "$BOT" ]; then
  BOT_PID=$(echo "$BOT" | awk '{print $2}')
  echo -e "${GREEN}📊 Bot:${NC} PID $BOT_PID"
  TOTAL=$((TOTAL + 1))
fi

if [ ! -z "$WS_SERVER" ]; then
  WS_SERVER_PID=$(echo "$WS_SERVER" | awk '{print $2}')
  echo -e "${GREEN}📡 WS-Server:${NC} PID $WS_SERVER_PID"
  TOTAL=$((TOTAL + 1))
fi

if [ ! -z "$WS_CLIENT" ]; then
  WS_CLIENT_PID=$(echo "$WS_CLIENT" | awk '{print $2}')
  echo -e "${GREEN}💻 WS-Client:${NC} PID $WS_CLIENT_PID"
  TOTAL=$((TOTAL + 1))
fi

echo ""

if [ $TOTAL -eq 0 ]; then
  echo -e "${RED}❌ No DTrader processes running${NC}"
else
  echo -e "${CYAN}Total: ${TOTAL} instance(s)${NC}"
fi

echo ""

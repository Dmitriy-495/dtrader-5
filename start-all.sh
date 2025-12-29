#!/bin/bash

clear

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    🚀 DTrader-5.1 - Starting All 🚀      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

wait_for_start() {
  local name=$1
  local pid=$2
  sleep 2
  if ps -p $pid > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name started (PID: $pid)${NC}"
  else
    echo -e "${RED}❌ $name failed to start${NC}"
    exit 1
  fi
}

# Убиваем старые процессы
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
pkill -9 -f "ts-node.*bot" 2>/dev/null
pkill -9 -f "ts-node.*ws-server" 2>/dev/null
pkill -9 -f "node.*ws-client" 2>/dev/null
sleep 1

# Проверяем Redis
echo ""
echo -e "${YELLOW}🔴 Checking Redis...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
  echo -e "${RED}❌ Redis is not running!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Redis is running${NC}"

mkdir -p logs

# Запускаем Bot
echo ""
echo -e "${YELLOW}📊 Starting Bot...${NC}"
cd bot
npm run dev > ../logs/bot.log 2>&1 &
BOT_PID=$!
cd ..
wait_for_start "Bot" $BOT_PID

# Запускаем WS-Server
echo ""
echo -e "${YELLOW}📡 Starting WS-Server...${NC}"
cd ws-server
npm run dev > ../logs/ws-server.log 2>&1 &
WS_SERVER_PID=$!
cd ..
wait_for_start "WS-Server" $WS_SERVER_PID

# Запускаем WS-Client
echo ""
echo -e "${YELLOW}💻 Starting WS-Client...${NC}"
cd ws-client
npm run dev > ../logs/ws-client.log 2>&1 &
WS_CLIENT_PID=$!
cd ..
wait_for_start "WS-Client" $WS_CLIENT_PID

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       ✅ All instances started! ✅         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📋 Process IDs:${NC}"
echo -e "   Bot:       ${BOT_PID}"
echo -e "   WS-Server: ${WS_SERVER_PID}"
echo -e "   WS-Client: ${WS_CLIENT_PID}"
echo ""
echo -e "${CYAN}📝 Logs:${NC}"
echo -e "   make logs-bot"
echo -e "   make logs-ws-server"
echo -e "   make logs-ws-client"
echo ""
echo -e "${CYAN}🛑 Stop: make stop${NC}"
echo ""

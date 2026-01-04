#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           📊 DTrader-5.1 System Monitor 📊                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Проверка Redis
echo -e "${YELLOW}🔴 Redis Status:${NC}"
if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}   ✅ Redis is running${NC}"
  
  # Статистика Redis
  echo -e "${BLUE}   📊 Redis Stats:${NC}"
  redis-cli INFO stats | grep -E "total_connections_received|total_commands_processed|instantaneous_ops_per_sec" | sed 's/^/      /'
  
  echo ""
  echo -e "${BLUE}   🔑 Active Channels:${NC}"
  redis-cli PUBSUB CHANNELS | head -10 | sed 's/^/      /'
  
else
  echo -e "${RED}   ❌ Redis is not running${NC}"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Проверка процессов
echo -e "${YELLOW}📋 Running Processes:${NC}"

BOT_PROC=$(ps aux | grep -E "nodemon.*bot|ts-node.*bot/src/app" | grep -v grep)
WS_SERVER_PROC=$(ps aux | grep -E "nodemon.*ws-server|ts-node.*ws-server/src/app" | grep -v grep)
WS_CLIENT_PROC=$(ps aux | grep -E "nodemon.*ws-client|node.*ws-client/src/client" | grep -v grep)

TOTAL_RUNNING=0

if [ ! -z "$BOT_PROC" ]; then
  BOT_PID=$(echo "$BOT_PROC" | awk '{print $2}')
  BOT_MEM=$(echo "$BOT_PROC" | awk '{print $4}')
  BOT_CPU=$(echo "$BOT_PROC" | awk '{print $3}')
  echo -e "${GREEN}   ✅ Bot:       ${NC}PID $BOT_PID | CPU: ${BOT_CPU}% | MEM: ${BOT_MEM}%"
  TOTAL_RUNNING=$((TOTAL_RUNNING + 1))
else
  echo -e "${RED}   ❌ Bot:       Not running${NC}"
fi

if [ ! -z "$WS_SERVER_PROC" ]; then
  WS_PID=$(echo "$WS_SERVER_PROC" | awk '{print $2}')
  WS_MEM=$(echo "$WS_SERVER_PROC" | awk '{print $4}')
  WS_CPU=$(echo "$WS_SERVER_PROC" | awk '{print $3}')
  echo -e "${GREEN}   ✅ WS-Server: ${NC}PID $WS_PID | CPU: ${WS_CPU}% | MEM: ${WS_MEM}%"
  TOTAL_RUNNING=$((TOTAL_RUNNING + 1))
else
  echo -e "${RED}   ❌ WS-Server: Not running${NC}"
fi

if [ ! -z "$WS_CLIENT_PROC" ]; then
  CLIENT_PID=$(echo "$WS_CLIENT_PROC" | awk '{print $2}')
  CLIENT_MEM=$(echo "$WS_CLIENT_PROC" | awk '{print $4}')
  CLIENT_CPU=$(echo "$WS_CLIENT_PROC" | awk '{print $3}')
  echo -e "${GREEN}   ✅ WS-Client: ${NC}PID $CLIENT_PID | CPU: ${CLIENT_CPU}% | MEM: ${CLIENT_MEM}%"
  TOTAL_RUNNING=$((TOTAL_RUNNING + 1))
else
  echo -e "${RED}   ❌ WS-Client: Not running${NC}"
fi

echo ""
echo -e "${CYAN}   Total Running: ${TOTAL_RUNNING}/3${NC}"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Проверка логов
echo -e "${YELLOW}📝 Log Files:${NC}"

if [ -d "logs" ]; then
  for log in logs/*.log; do
    if [ -f "$log" ]; then
      SIZE=$(du -h "$log" | cut -f1)
      LINES=$(wc -l < "$log")
      MODIFIED=$(stat -c %y "$log" 2>/dev/null || stat -f "%Sm" "$log" 2>/dev/null)
      echo -e "   📄 $(basename $log): ${SIZE} | ${LINES} lines | Modified: ${MODIFIED}"
    fi
  done
else
  echo -e "${RED}   ❌ logs/ directory not found${NC}"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Последние события (если есть логи)
if [ -f "logs/bot.log" ]; then
  echo -e "${YELLOW}🔍 Last Bot Events (last 5):${NC}"
  tail -5 logs/bot.log | while IFS= read -r line; do
    # Пробуем распарсить JSON
    if echo "$line" | jq . > /dev/null 2>&1; then
      EVENT=$(echo "$line" | jq -r '.event // "UNKNOWN"')
      LEVEL=$(echo "$line" | jq -r '.level // "info"')
      
      case $LEVEL in
        error) COLOR=$RED ;;
        warn)  COLOR=$YELLOW ;;
        *)     COLOR=$GREEN ;;
      esac
      
      echo -e "${COLOR}   • $EVENT${NC}"
    else
      echo -e "${BLUE}   $line${NC}"
    fi
  done
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Команды
echo -e "${MAGENTA}💡 Quick Commands:${NC}"
echo -e "   ${CYAN}make logs-bot${NC}        - View Bot logs"
echo -e "   ${CYAN}make logs-ws-server${NC}  - View WS-Server logs"
echo -e "   ${CYAN}make logs-ws-client${NC}  - View WS-Client logs"
echo -e "   ${CYAN}make stop${NC}            - Stop all instances"
echo -e "   ${CYAN}redis-cli MONITOR${NC}    - Monitor Redis commands"

echo ""
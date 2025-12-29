#!/bin/bash

# ============================================
# DTrader-5.1 - Просмотр логов
# ============================================

CYAN='\033[0;36m'
NC='\033[0m'

show_usage() {
  echo "Usage: ./logs.sh [bot|ws-server|ws-client|all]"
  echo ""
  echo "Examples:"
  echo "  ./logs.sh bot          - Show bot logs"
  echo "  ./logs.sh ws-server    - Show ws-server logs"
  echo "  ./logs.sh ws-client    - Show ws-client logs"
  echo "  ./logs.sh all          - Show all logs"
}

if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

case $1 in
  bot)
    echo -e "${CYAN}📊 Bot logs:${NC}"
    tail -f logs/bot.log
    ;;
  ws-server)
    echo -e "${CYAN}📡 WS-Server logs:${NC}"
    tail -f logs/ws-server.log
    ;;
  ws-client)
    echo -e "${CYAN}💻 WS-Client logs:${NC}"
    tail -f logs/ws-client.log
    ;;
  all)
    echo -e "${CYAN}📋 All logs:${NC}"
    tail -f logs/*.log
    ;;
  *)
    show_usage
    exit 1
    ;;
esac

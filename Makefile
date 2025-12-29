.PHONY: help start stop restart logs logs-bot logs-ws-server logs-ws-client status clean

help:
	@echo "╔════════════════════════════════════════════╗"
	@echo "║     DTrader-5.1 Commands                  ║"
	@echo "╚════════════════════════════════════════════╝"
	@echo ""
	@echo "  make start          - Start all instances"
	@echo "  make stop           - Stop all instances"
	@echo "  make restart        - Restart all instances"
	@echo "  make status         - Show running processes"
	@echo ""
	@echo "  make logs           - Show all logs"
	@echo "  make logs-bot       - Show bot logs"
	@echo "  make logs-ws-server - Show ws-server logs"
	@echo "  make logs-ws-client - Show ws-client logs"
	@echo ""
	@echo "  make clean          - Stop all and clean logs"
	@echo ""

start:
	@./start-all.sh

stop:
	@./stop-all.sh

restart:
	@echo "🔄 Restarting all instances..."
	@./stop-all.sh
	@sleep 2
	@./start-all.sh

status:
	@./status.sh

logs:
	@./logs.sh all

logs-bot:
	@./logs.sh bot

logs-ws-server:
	@./logs.sh ws-server

logs-ws-client:
	@./logs.sh ws-client

clean:
	@./stop-all.sh
	@echo ""
	@echo "🧹 Cleaning logs..."
	@rm -f logs/*.log
	@echo "✅ Logs cleaned"
	@echo ""

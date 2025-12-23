# ============================================
# DTrader-5 Makefile (Native, No Docker)
# ============================================

.PHONY: help

# Цвета
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
RED=\033[0;31m
NC=\033[0m

PROJECT_NAME=dtrader-5

# ============================================
# HELP
# ============================================

help:
	@echo "$(GREEN)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║              🚀 DTrader-5 - Makefile Commands 🚀             ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)📦 SETUP:$(NC)"
	@echo "  $(BLUE)make init$(NC)              - Инициализация проекта"
	@echo "  $(BLUE)make install$(NC)           - Установить все зависимости"
	@echo ""
	@echo "$(YELLOW)🔴 REDIS:$(NC)"
	@echo "  $(BLUE)make redis-start$(NC)       - Запустить Redis"
	@echo "  $(BLUE)make redis-stop$(NC)        - Остановить Redis"
	@echo "  $(BLUE)make redis-status$(NC)      - Статус Redis"
	@echo "  $(BLUE)make redis-health$(NC)      - Проверить здоровье"
	@echo "  $(BLUE)make redis-monitor$(NC)     - Мониторинг"
	@echo "  $(BLUE)make redis-cli$(NC)         - Redis CLI"
	@echo "  $(BLUE)make redis-test$(NC)        - Тестировать Redis"
	@echo "  $(BLUE)make redis-flush$(NC)       - Очистить данные"
	@echo ""
	@echo "$(YELLOW)🤖 BOT:$(NC)"
	@echo "  $(BLUE)make bot-install$(NC)       - Установить зависимости bot"
	@echo "  $(BLUE)make bot-build$(NC)         - Собрать bot"
	@echo "  $(BLUE)make bot-dev$(NC)           - Запустить bot (dev)"
	@echo "  $(BLUE)make bot-start$(NC)         - Запустить bot (prod)"
	@echo "  $(BLUE)make bot-stop$(NC)          - Остановить bot"
	@echo "  $(BLUE)make bot-logs$(NC)          - Показать логи bot"
	@echo ""
	@echo "$(YELLOW)🧪 TESTING:$(NC)"
	@echo "  $(BLUE)make test$(NC)              - Запустить все тесты"
	@echo ""

# ============================================
# INITIALIZATION
# ============================================

init:
	@echo "$(GREEN)🚀 Инициализация DTrader-5...$(NC)"
	@./scripts/setup/init.sh

install:
	@echo "$(GREEN)📦 Установка зависимостей...$(NC)"
	@./scripts/setup/install-all.sh

# ============================================
# REDIS (NATIVE)
# ============================================

redis-start:
	@echo "$(GREEN)🔴 Запуск Redis (native)...$(NC)"
	@./redis/scripts/start.sh

redis-stop:
	@echo "$(YELLOW)🔴 Остановка Redis...$(NC)"
	@./redis/scripts/stop.sh

redis-status:
	@echo "$(GREEN)🔴 Статус Redis:$(NC)"
	@./redis/scripts/status.sh

redis-health:
	@echo "$(GREEN)🔴 Health check Redis:$(NC)"
	@./redis/scripts/healthcheck.sh

redis-monitor:
	@echo "$(GREEN)🔴 Мониторинг Redis:$(NC)"
	@./redis/scripts/monitor.sh

redis-cli:
	@echo "$(GREEN)🔴 Redis CLI:$(NC)"
	@./redis/scripts/cli.sh

redis-test:
	@echo "$(GREEN)🧪 Тестирование Redis:$(NC)"
	@./scripts/utils/test-redis.sh

redis-flush:
	@echo "$(RED)⚠️  ВНИМАНИЕ: Все данные в Redis будут удалены!$(NC)"
	@read -p "Вы уверены? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		./redis/scripts/cli.sh FLUSHALL; \
		echo "$(GREEN)✅ Redis очищен$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

redis-info:
	@./redis/scripts/cli.sh INFO

redis-keys:
	@./redis/scripts/cli.sh KEYS '*'

redis-channels:
	@./redis/scripts/cli.sh PUBSUB CHANNELS

# ============================================
# BOT
# ============================================

bot-install:
	@echo "$(GREEN)📦 Установка зависимостей bot...$(NC)"
	cd bot && npm install

bot-build:
	@echo "$(GREEN)🔨 Сборка bot...$(NC)"
	cd bot && npm run build

bot-dev:
	@echo "$(GREEN)🔧 Запуск bot (dev)...$(NC)"
	cd bot && npm run start:dev

bot-start:
	@echo "$(GREEN)🚀 Запуск bot (prod)...$(NC)"
	cd bot && npm run start

bot-stop:
	@echo "$(YELLOW)🛑 Остановка bot...$(NC)"
	@pkill -f "node.*bot" || echo "Bot не запущен"

bot-logs:
	@echo "$(GREEN)📋 Логи bot:$(NC)"
	@tail -f bot/logs/*.log

# ============================================
# TESTING
# ============================================

test:
	@echo "$(GREEN)🧪 Запуск всех тестов...$(NC)"
	@./scripts/utils/run-all-tests.sh

# ============================================
# UTILITIES
# ============================================

clean:
	@echo "$(YELLOW)🧹 Очистка проекта...$(NC)"
	@rm -rf bot/dist bot/node_modules
	@rm -rf ws-server/dist ws-server/node_modules
	@rm -rf shared/lib/typescript/dist shared/lib/typescript/node_modules
	@echo "$(GREEN)✅ Проект очищен$(NC)"

logs:
	@echo "$(GREEN)📋 Все логи:$(NC)"
	@tail -f logs/*.log

ps:
	@echo "$(GREEN)🔍 Процессы:$(NC)"
	@ps aux | grep -E "(redis|node.*dtrader)" | grep -v grep || echo "Процессы не найдены"

kill-all:
	@echo "$(RED)🛑 Остановка всех процессов...$(NC)"
	@pkill -f redis-server || true
	@pkill -f "node.*dtrader" || true
	@echo "$(GREEN)✅ Все процессы остановлены$(NC)"

# ============================================
# SHARED LIBRARY
# ============================================

shared-build:
	@echo "$(GREEN)📦 Сборка shared библиотеки...$(NC)"
	cd shared/lib/typescript && npm install && npm run build
	@echo "$(GREEN)✅ Shared библиотека собрана$(NC)"

# ============================================
# QUICK COMMANDS
# ============================================

start: redis-start bot-start
	@echo "$(GREEN)✅ Все сервисы запущены!$(NC)"

stop: redis-stop bot-stop
	@echo "$(GREEN)✅ Все сервисы остановлены!$(NC)"

restart: stop start
	@echo "$(GREEN)✅ Все сервисы перезапущены!$(NC)"

status: redis-status
	@echo ""
	@make ps

# ============================================
# BOT SERVICE (полные команды)
# ============================================

bot-dev: shared-build
	@echo "$(GREEN)🔧 Запуск bot (development)...$(NC)"
	cd bot && npm run start:dev

bot-test:
	@echo "$(GREEN)🧪 Тестирование bot...$(NC)"
	cd bot && npm test

bot-logs-tail:
	@echo "$(GREEN)📋 Логи bot (tail):$(NC)"
	@tail -f logs/bot.log

bot-check:
	@echo "$(GREEN)🔍 Проверка bot...$(NC)"
	cd bot && npm run type-check

# ============================================
# QUICK START
# ============================================

dev: redis-start bot-dev
	@echo "$(GREEN)✅ Dev окружение запущено!$(NC)"


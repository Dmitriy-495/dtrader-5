#!/bin/bash

# ============================================
# DTrader-5 Initialization Script
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           🚀 DTrader-5 Initialization Script 🚀              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Проверка зависимостей
echo -e "${YELLOW}📋 Проверка зависимостей...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен${NC}"
    echo -e "${YELLOW}   Установите: https://nodejs.org/${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
fi

# Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 не установлен${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Python $(python3 --version)${NC}"
fi

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker не установлен (опционально)${NC}"
else
    echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3)${NC}"
fi

# Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis CLI не установлен (опционально)${NC}"
else
    echo -e "${GREEN}✅ Redis CLI$(NC}"
fi

echo ""

# Создание .env если не существует
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Создание .env из .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env создан${NC}"
    echo -e "${RED}⚠️  ВАЖНО: Отредактируйте .env и добавьте реальные API ключи!${NC}"
else
    echo -e "${GREEN}✅ .env уже существует${NC}"
fi

echo ""

# Создание директорий
echo -e "${YELLOW}📁 Создание директорий...${NC}"
mkdir -p logs
mkdir -p shared/lib/typescript/dist
mkdir -p shared/lib/python/dist
echo -e "${GREEN}✅ Директории созданы${NC}"

echo ""

# Git hooks (если это git репозиторий)
if [ -d .git ]; then
    echo -e "${YELLOW}🔗 Установка git hooks...${NC}"
    
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
echo "🔍 Running pre-commit checks..."
make check-all || exit 1
HOOK
    chmod +x .git/hooks/pre-commit
    
    echo -e "${GREEN}✅ Git hooks установлены${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА! ✅              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo -e "  1. Отредактируйте .env (добавьте API ключи Gate.io)"
echo -e "  2. Запустите: ${GREEN}make install${NC}"
echo -e "  3. Запустите: ${GREEN}make docker-up${NC}"
echo -e "  4. Проверьте: ${GREEN}make health${NC}"
echo ""

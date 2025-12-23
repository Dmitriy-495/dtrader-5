#!/bin/bash

# ============================================
# Start Redis (System Service)
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔴 Проверка Redis...${NC}"

# Проверка, запущен ли системный Redis
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✅ Redis уже запущен (systemd service)${NC}"
    
    # Проверка подключения
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Подключение работает${NC}"
        
        # Информация
        echo ""
        echo -e "${YELLOW}📊 Информация:${NC}"
        systemctl status redis-server --no-pager | head -5
        
    else
        echo -e "${RED}❌ Redis запущен, но не отвечает${NC}"
        echo -e "${YELLOW}Попробуйте: sudo systemctl restart redis-server${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Redis не запущен, запускаю...${NC}"
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl start redis-server
        sleep 2
        
        if systemctl is-active --quiet redis-server; then
            echo -e "${GREEN}✅ Redis запущен!${NC}"
        else
            echo -e "${RED}❌ Не удалось запустить Redis${NC}"
            echo -e "${YELLOW}Попробуйте вручную: sudo systemctl start redis-server${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ systemctl не найден${NC}"
        echo -e "${YELLOW}Запустите вручную: redis-server${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ✅ Redis готов к работе! ✅                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"

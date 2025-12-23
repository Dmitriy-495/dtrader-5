#!/bin/bash

# ============================================
# Stop Redis (System Service)
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔴 Остановка Redis...${NC}"

if systemctl is-active --quiet redis-server; then
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Это остановит системный Redis!${NC}"
    echo -e "${YELLOW}   Это может повлиять на другие приложения.${NC}"
    read -p "Продолжить? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        sudo systemctl stop redis-server
        sleep 1
        
        if ! systemctl is-active --quiet redis-server; then
            echo -e "${GREEN}✅ Redis остановлен${NC}"
        else
            echo -e "${RED}❌ Не удалось остановить Redis${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Отменено${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Redis уже остановлен${NC}"
fi

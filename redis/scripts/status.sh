#!/bin/bash

# ============================================
# Redis Status (System Service)
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                     🔴 Redis Status 🔴                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Systemd статус
if command -v systemctl &> /dev/null; then
    echo -e "${YELLOW}📊 Systemd Service:${NC}"
    systemctl status redis-server --no-pager | head -10
    echo ""
fi

# Проверка подключения
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis отвечает${NC}"
    echo ""
    
    # Краткая статистика
    echo -e "${YELLOW}📊 Статистика:${NC}"
    redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO stats | grep -E "total_commands_processed|instantaneous_ops_per_sec|total_connections_received" | sed 's/^/   /'
    
    echo ""
    echo -e "${YELLOW}💾 Память:${NC}"
    redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory | grep -E "used_memory_human|used_memory_peak_human" | sed 's/^/   /'
    
    echo ""
    echo -e "${YELLOW}👥 Клиенты:${NC}"
    redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO clients | grep -E "connected_clients|blocked_clients" | sed 's/^/   /'
    
    echo ""
    echo -e "${YELLOW}🔑 Keyspace:${NC}"
    redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO keyspace | sed 's/^/   /'
    
else
    echo -e "${RED}❌ Redis не отвечает${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ✅ Redis работает нормально! ✅            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"

#!/bin/bash

# ============================================
# Redis Monitoring Script
# ============================================

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🔴 Redis Monitoring 🔴                      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Info
echo -e "${YELLOW}📊 Server Info:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO server | grep -E "redis_version|uptime_in_seconds|process_id"
echo ""

# Memory
echo -e "${YELLOW}💾 Memory:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human"
echo ""

# Clients
echo -e "${YELLOW}👥 Clients:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO clients | grep -E "connected_clients|blocked_clients"
echo ""

# Stats
echo -e "${YELLOW}📈 Stats:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO stats | grep -E "total_connections_received|total_commands_processed|instantaneous_ops_per_sec"
echo ""

# Keyspace
echo -e "${YELLOW}🔑 Keyspace:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO keyspace
echo ""

# Pub/Sub
echo -e "${YELLOW}📡 Pub/Sub:${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT PUBSUB CHANNELS | head -20
echo ""

echo -e "${BLUE}💡 Для real-time мониторинга используйте:${NC}"
echo -e "   redis-cli -h $REDIS_HOST -p $REDIS_PORT MONITOR"

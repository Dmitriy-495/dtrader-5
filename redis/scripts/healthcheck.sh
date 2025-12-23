#!/bin/bash

# ============================================
# Redis Health Check Script
# ============================================

set -e

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

# Проверка подключения
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
    exit 0
else
    echo "❌ Redis is not responding"
    exit 1
fi

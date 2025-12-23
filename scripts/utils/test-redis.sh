#!/bin/bash

# ============================================
# Test Redis Instance
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🧪 Testing Redis Instance 🧪                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Connection
echo -e "${YELLOW}Test 1: Connection...${NC}"
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    exit 1
fi
echo ""

# Test 2: Set/Get
echo -e "${YELLOW}Test 2: Set/Get...${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT SET test_key "Hello DTrader-5" > /dev/null
RESULT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT GET test_key)
if [ "$RESULT" = "Hello DTrader-5" ]; then
    echo -e "${GREEN}✅ Set/Get working${NC}"
else
    echo -e "${RED}❌ Set/Get failed${NC}"
    exit 1
fi
redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL test_key > /dev/null
echo ""

# Test 3: Pub/Sub
echo -e "${YELLOW}Test 3: Pub/Sub...${NC}"
(redis-cli -h $REDIS_HOST -p $REDIS_PORT SUBSCRIBE test_channel > /tmp/redis_sub.log 2>&1 &)
sleep 1
redis-cli -h $REDIS_HOST -p $REDIS_PORT PUBLISH test_channel "Test message" > /dev/null
sleep 1
if grep -q "Test message" /tmp/redis_sub.log; then
    echo -e "${GREEN}✅ Pub/Sub working${NC}"
else
    echo -e "${RED}❌ Pub/Sub failed${NC}"
    exit 1
fi
pkill -f "redis-cli.*SUBSCRIBE" || true
rm -f /tmp/redis_sub.log
echo ""

# Test 4: Channels from config
echo -e "${YELLOW}Test 4: Testing channels from config...${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT PUBLISH "market:orderbook:BTC_USDT" '{"test": true}' > /dev/null
redis-cli -h $REDIS_HOST -p $REDIS_PORT PUBLISH "signal:test_strategy:buy" '{"pair": "BTC_USDT"}' > /dev/null
echo -e "${GREEN}✅ Channels working${NC}"
echo ""

# Test 5: Streams
echo -e "${YELLOW}Test 5: Streams...${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD stream:market '*' event test_event timestamp $(date +%s) > /dev/null
STREAM_LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN stream:market)
if [ "$STREAM_LEN" -gt "0" ]; then
    echo -e "${GREEN}✅ Streams working (length: $STREAM_LEN)${NC}"
else
    echo -e "${RED}❌ Streams failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ ALL REDIS TESTS PASSED! ✅                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"

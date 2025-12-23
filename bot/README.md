# 🤖 Bot Service (Instance B)

Сервис сбора данных с Gate.io для DTrader-5.

## Функции

- 📊 **Order Book** - сбор данных order book через WebSocket
- 💰 **Balance** - мониторинг баланса (futures)
- 📈 **Trades** - сбор сделок (опционально)
- 🔴 **Redis Publishing** - публикация данных в Redis

## Технологии

- Node.js + TypeScript
- WebSocket (Gate.io Futures API)
- Redis (Pub/Sub)
- Shared библиотека (@dtrader5/shared)

## Установка
```bash
cd bot
npm install
```

## Конфигурация

Настройки в `config.yaml`:
```yaml
data_collection:
  orderbook:
    enabled: true
    pairs:
      - BTC_USDT
      - ETH_USDT
    depth: 20
    update_speed: 100ms
```

## Запуск
```bash
# Development
npm run start:dev

# Production
npm run start

# Через Makefile (из корня)
make bot-dev
make bot-start
```

## Тестирование
```bash
# Все тесты
npm test

# Отдельные тесты
npm run test:orderbook
```

## Мониторинг

Bot публикует данные в Redis каналы:
- `market:orderbook:BTC_USDT` - Order Book updates
- `market:balance:update` - Balance updates

Подписаться:
```bash
redis-cli SUBSCRIBE "market:orderbook:*"
```

## Архитектура
```
Bot Service
├── OrderBook WS → Redis (market:orderbook:{pair})
├── Balance WS → Redis (market:balance:update)
└── Trades WS → Redis (market:trades:{pair})
```

## Troubleshooting

### WebSocket не подключается
- Проверьте интернет соединение
- Убедитесь что Gate.io доступен

### Redis ошибки
- Проверьте что Redis запущен: `make redis-status`
- Проверьте настройки в `.env`

### Order Book не получает данные
- Проверьте что пары правильно указаны в `config.yaml`
- Некоторые пары могут быть неактивны на Gate.io

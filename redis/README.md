# 🔴 Redis Instance (Instance A)

Центральная шина данных для DTrader-5.

## Использование системного Redis

DTrader-5 использует системный Redis (установленный через `apt`/`brew`/`pacman`).

### Управление
```bash
# Статус
sudo systemctl status redis-server

# Запуск
sudo systemctl start redis-server

# Остановка
sudo systemctl stop redis-server

# Перезапуск
sudo systemctl restart redis-server

# Автозапуск при загрузке
sudo systemctl enable redis-server
```

### Через Makefile
```bash
# Проверка и запуск (если нужно)
make redis-start

# Статус
make redis-status

# Health check
make redis-health

# Мониторинг
make redis-monitor

# CLI
make redis-cli

# Тесты
make redis-test
```

## Конфигурация

Системный конфиг: `/etc/redis/redis.conf`

Для изменения настроек:
```bash
sudo nano /etc/redis/redis.conf
sudo systemctl restart redis-server
```

## Каналы DTrader-5

### Market Data
- `market:orderbook:{pair}` - Order Book updates
- `market:trades:{pair}` - Trades stream
- `market:balance:update` - Balance updates

### Trading Signals
- `signal:{strategy}:buy` - Buy signals
- `signal:{strategy}:sell` - Sell signals

### Orders
- `order:new` - New order
- `order:executed` - Order executed
- `order:cancelled` - Order cancelled

### Risk Management
- `risk:alert` - Risk alerts
- `risk:limit:exceeded` - Limit exceeded

### System
- `system:heartbeat:{service}` - Service heartbeats
- `system:health:{service}` - Health checks

## Мониторинг
```bash
# Redis CLI
redis-cli

# Мониторинг команд в реальном времени
redis-cli MONITOR

# Статистика
redis-cli INFO

# Активные каналы
redis-cli PUBSUB CHANNELS

# Ключи (для разработки)
redis-cli KEYS 'market:*'
```

## Troubleshooting

### Redis не запускается
```bash
# Проверить логи
sudo journalctl -u redis-server -n 50

# Проверить конфигурацию
redis-server /etc/redis/redis.conf --test-memory 1
```

### Ошибка подключения
```bash
# Проверить порт
sudo netstat -tulpn | grep 6379

# Проверить bind адрес в конфиге
grep "^bind" /etc/redis/redis.conf
```

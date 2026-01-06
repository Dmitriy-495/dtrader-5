# 🚀 DTrader-5 - Next Generation Trading Bot

## 🏗️ Архитектура

[диаграмма остаётся]

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- Python 3.9+
- Redis 6.0+

### Установка

1. **Клонируем репо**

```bash
git clone
cd dtrader-5
```

2. **Настраиваем переменные окружения**

```bash
cp bot/.env.example bot/.env
cp ws-server/.env.example ws-server/.env
cp ws-client/.env.example ws-client/.env
cp scanner/.env.example scanner/.env

# Отредактируйте .env файлы с вашими данными
```

3. **Устанавливаем зависимости**

```bash
# Bot
cd bot && npm install && cd ..

# WS-Server
cd ws-server && npm install && cd ..

# WS-Client
cd ws-client && npm install && cd ..

# Scanner
cd scanner && pip3 install -r requirements.txt && cd ..
```

4. **Убедитесь, что Redis запущен**

```bash
redis-cli ping
# Должна быть ответ: PONG
```

## 📡 Запуск сервисов (вручную)

### Терминал 1 - Bot (сбор данных)

```bash
cd bot
npm run dev
```

### Терминал 2 - WS-Server (broadcasting)

```bash
cd ws-server
npm run dev
```

### Терминал 3 - WS-Client (тестовый клиент)

```bash
cd ws-client
npm start
```

### Терминал 4 - Scanner (поиск волатильности)

```bash
cd scanner
python3 src/main.py
```

## 📊 Структура сервисов

| Сервис        | Язык         | Порт | Роль                  |
| ------------- | ------------ | ---- | --------------------- |
| **Bot**       | Node.js + TS | 1971 | Сбор данных с Gate.io |
| **WS-Server** | Node.js + TS | 2808 | Broadcasting данных   |
| **WS-Client** | Node.js      | -    | Тестовый клиент       |
| **Scanner**   | Python       | -    | Анализ волатильности  |
| **Redis**     | -            | 6379 | Pub/Sub шина данных   |

## 🧪 Тесты

### Bot тесты

```bash
cd bot
npm run test:redis      # Тест Redis publisher
npm run test:events     # Тест event system
npm run test:state      # Тест state manager
```

## 📝 Логирование

Все сервисы логируют события в JSON формате (одна строка на логе).

Пример логирования Bot:

```bash
tail -f logs/bot.log | jq .   # красивый вывод JSON
```

## 🔧 Troubleshooting

### Redis не подключается

```bash
# Проверить что Redis запущен
redis-cli ping

# Если не запущен (Linux/Mac)
sudo systemctl start redis-server

# Или просто:
redis-server
```

### Порт уже в использовании

```bash
# Найти процесс
lsof -i :2808

# Убить процесс
kill -9
```

## 📦 Переменные окружения

Обязательные в `bot/.env`:

- `GATEIO_API_KEY` - ваш API ключ Gate.io
- `GATEIO_API_SECRET` - ваш API secret Gate.io
- `BASE_URL_REST` - https://api.gateio.ws
- `BASE_URL_WS` - wss://fx-ws.gateio.ws/v4/ws/usdt

## 📚 Документация

- [Gate.io API docs](https://www.gate.io/docs/developers/webapi)
- [Redis docs](https://redis.io/docs/)

## 📜 Лицензия

MIT

#!/bin/bash

# Скрипт остановки всех сервисов DTrader-5
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Функция для безопасного поиска процессов
find_processes() {
    ps aux | grep -E "(npm|node|redis-server)" | grep "$SCRIPT_DIR" | grep -v grep | grep -v "restart-services.sh" | grep -v "stop-services.sh"
}

echo "🛑 Остановка всех сервисов DTrader-5..."
echo "Директория: $SCRIPT_DIR"
echo ""

# Находим все процессы
echo "Поиск запущенных процессов:"
find_processes

PIDS=$(find_processes | awk '{print $2}')

if [ -n "$PIDS" ]; then
    echo ""
    echo "Найдено процессов: $(echo $PIDS | wc -w)"
    echo "Останавливаем процессы: $PIDS"
    
    # Пробуем остановить gracefully
    kill $PIDS 2>/dev/null
    sleep 2
    
    # Проверяем, остались ли процессы
    REMAINING=$(find_processes | awk '{print $2}')
    
    if [ -n "$REMAINING" ]; then
        echo "Принудительная остановка: $REMAINING"
        kill -9 $REMAINING 2>/dev/null
    fi
    
    echo "✅ Все процессы остановлены"
else
    echo "✅ Нет запущенных процессов"
fi

# Останавливаем Redis если он запущен
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "Останавливаем Redis..."
    redis-cli shutdown 2>/dev/null || true
    echo "✅ Redis остановлен"
fi

echo ""
echo "Все сервисы остановлены. Можно запускать заново командой:"
echo "./restart-services.sh"#!/bin/bash

# Скрипт остановки всех сервисов DTrader-5
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Функция для безопасного поиска процессов
find_processes() {
    ps aux | grep -E "(npm|node|redis-server)" | grep "$SCRIPT_DIR" | grep -v grep | grep -v "restart-services.sh" | grep -v "stop-services.sh"
}

echo "🛑 Остановка всех сервисов DTrader-5..."
echo "Директория: $SCRIPT_DIR"
echo ""

# Находим все процессы
echo "Поиск запущенных процессов:"
find_processes

PIDS=$(find_processes | awk '{print $2}')

if [ -n "$PIDS" ]; then
    echo ""
    echo "Найдено процессов: $(echo $PIDS | wc -w)"
    echo "Останавливаем процессы: $PIDS"
    
    # Пробуем остановить gracefully
    kill $PIDS 2>/dev/null
    sleep 2
    
    # Проверяем, остались ли процессы
    REMAINING=$(find_processes | awk '{print $2}')
    
    if [ -n "$REMAINING" ]; then
        echo "Принудительная остановка: $REMAINING"
        kill -9 $REMAINING 2>/dev/null
    fi
    
    echo "✅ Все процессы остановлены"
else
    echo "✅ Нет запущенных процессов"
fi

# Останавливаем Redis если он запущен
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "Останавливаем Redis..."
    redis-cli shutdown 2>/dev/null || true
    echo "✅ Redis остановлен"
fi

echo ""
echo "Все сервисы остановлены. Можно запускать заново командой:"
echo "./restart-services.sh"
#!/bin/bash

# ==============================================
# Скрипт перезапуска сервисов DTrader-5
# Расположение: /home/tda/code/dtrader/dtrader-5/
# ==============================================

# Текущая директория (где находится скрипт)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Функция для безопасного поиска процессов (исключаем grep и сам скрипт)
find_processes() {
    ps aux | grep -E "(npm|node|redis-server)" | grep "$SCRIPT_DIR" | grep -v grep | grep -v "restart-services.sh" | grep -v "stop-services.sh"
}

# Функция для остановки всех процессов
stop_all() {
    echo "🛑 Остановка всех запущенных сервисов..."
    echo ""
    
    # Ищем все процессы npm в нашей директории (без grep и скриптов)
    echo "Поиск процессов в $SCRIPT_DIR..."
    PIDS=$(find_processes | awk '{print $2}')
    
    if [ -n "$PIDS" ]; then
        echo "Найдены процессы для остановки:"
        find_processes
        
        echo "Отправляем SIGTERM..."
        kill $PIDS 2>/dev/null
        sleep 2
        
        # Проверяем, остались ли процессы
        REMAINING=$(find_processes | awk '{print $2}')
        if [ -n "$REMAINING" ]; then
            echo "Принудительная остановка (SIGKILL)..."
            kill -9 $REMAINING 2>/dev/null
        fi
    else
        echo "Активных процессов не найдено"
    fi
    
    # Останавливаем Redis если он запущен
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "Останавливаем Redis..."
        redis-cli shutdown 2>/dev/null || true
    fi
    
    echo "✅ Все сервисы остановлены"
    echo ""
    sleep 1
}

# Функция проверки доступности сервиса
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=20
    local attempt=1
    
    echo -n "⏳ Ожидание $service_name... "
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" >/dev/null 2>&1; then
            echo "✅"
            return 0
        fi
        sleep 1
        echo -n "."
        ((attempt++))
    done
    
    echo "❌ (таймаут)"
    return 1
}

# Функция запуска Redis
start_redis() {
    echo ""
    echo "🔴 Запуск Redis..."
    
    # Проверяем установлен ли Redis
    if ! command -v redis-server &> /dev/null; then
        echo "Ошибка: Redis не установлен!"
        echo "Установите: sudo apt install redis-server"
        exit 1
    fi
    
    # Запускаем Redis сервер
    echo "Запускаем Redis сервер на порту 6379..."
    xfce4-terminal --title="Redis Server" --geometry=80x20 \
        -e "bash -c 'echo \"=== Redis Server ===\"; echo \"Порт: 6379\"; echo \"Директория: $SCRIPT_DIR\"; echo \"\"; redis-server; exec bash'" &
    
    # Ждем запуска Redis
    wait_for_service "Redis" "redis-cli ping 2>/dev/null | grep -q PONG"
    
    if [ $? -eq 0 ]; then
        # Запускаем мониторинг Redis
        echo "Запускаем Redis Monitor..."
        xfce4-terminal --title="Redis Monitor" --geometry=100x30 \
            -e "bash -c 'echo \"=== Redis MONITOR ===\"; echo \"Отслеживание команд Redis...\"; echo \"\"; redis-cli MONITOR; exec bash'" &
        echo "✅ Redis запущен и мониторинг активирован"
    else
        echo "❌ Ошибка: Redis не запустился"
        exit 1
    fi
}

# Функция запуска WebSocket сервера
start_ws_server() {
    echo ""
    echo "🌐 Запуск WebSocket сервера..."
    
    if [ ! -d "ws-server" ]; then
        echo "❌ Ошибка: директория ws-server не найдена!"
        exit 1
    fi
    
    echo "Директория: $SCRIPT_DIR/ws-server"
    xfce4-terminal --title="WS Server" --geometry=100x35 \
        -e "bash -c 'cd \"$SCRIPT_DIR/ws-server\" && echo \"=== WebSocket Server ===\" && echo \"Директория: \$PWD\" && echo \"\" && npm run dev; exec bash'" &
    
    # Ждем немного для запуска
    sleep 3
    echo "✅ WebSocket сервер запускается..."
}

# Функция запуска бота
start_bot() {
    echo ""
    echo "🤖 Запуск бота..."
    
    if [ ! -d "bot" ]; then
        echo "❌ Ошибка: директория bot не найдена!"
        exit 1
    fi
    
    echo "Директория: $SCRIPT_DIR/bot"
    xfce4-terminal --title="Bot" --geometry=100x35 \
        -e "bash -c 'cd \"$SCRIPT_DIR/bot\" && echo \"=== Bot ===\" && echo \"Директория: \$PWD\" && echo \"\" && npm run dev; exec bash'" &
    
    sleep 2
    echo "✅ Бот запускается..."
}

# Функция запуска WebSocket клиента
start_ws_client() {
    echo ""
    echo "💻 Запуск WebSocket клиента..."
    
    if [ ! -d "ws-client" ]; then
        echo "❌ Ошибка: директория ws-client не найдена!"
        exit 1
    fi
    
    echo "Директория: $SCRIPT_DIR/ws-client"
    xfce4-terminal --title="WS Client" --geometry=100x35 \
        -e "bash -c 'cd \"$SCRIPT_DIR/ws-client\" && echo \"=== WebSocket Client ===\" && echo \"Директория: \$PWD\" && echo \"\" && npm run dev; exec bash'" &
    
    sleep 2
    echo "✅ WebSocket клиент запускается..."
}

# Функция показа статуса
show_status() {
    echo ""
    echo "========================================"
    echo "📊 ТЕКУЩИЙ СТАТУС ПРОЦЕССОВ:"
    echo "========================================"
    
    echo "Процессы в директории $SCRIPT_DIR:"
    echo "----------------------------------------"
    
    local processes=$(find_processes)
    
    if [ -n "$processes" ]; then
        echo "$processes" | while read line; do
            pid=$(echo $line | awk '{print $2}')
            cmd=$(echo $line | awk '{for(i=11;i<=NF;i++) printf $i " "; print ""}')
            echo "PID: $pid | $cmd"
        done
    else
        echo "Активных процессов не найдено"
    fi
    
    echo "----------------------------------------"
    
    # Проверяем Redis
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "Redis: ✅ работает (порт 6379)"
    else
        echo "Redis: ❌ не запущен"
    fi
}

# Основная программа
main() {
    clear
    
    echo "========================================"
    echo "   СКРИПТ ПЕРЕЗАПУСКА DTRADER-5"
    echo "========================================"
    echo "Версия: 1.0"
    echo "Дата: $(date)"
    echo "Директория: $SCRIPT_DIR"
    echo "========================================"
    echo ""
    
    # Показываем текущий статус
    show_status
    
    echo ""
    read -p "Нажмите Enter для перезапуска или Ctrl+C для отмены..."
    
    # 1. Останавливаем всё
    stop_all
    
    # 2. Запускаем в правильном порядке
    echo ""
    echo "🚀 ЗАПУСК СЕРВИСОВ В ПОРЯДКЕ:"
    echo "1. Redis Server"
    echo "2. Redis Monitor"
    echo "3. WebSocket Server"
    echo "4. Bot"
    echo "5. WebSocket Client"
    echo ""
    
    # Запускаем сервисы
    start_redis
    start_ws_server
    start_bot
    start_ws_client
    
    # Итоговый статус
    echo ""
    echo "========================================"
    echo "✅ ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ!"
    echo "========================================"
    echo ""
    echo "Открытые окна терминала:"
    echo "1. Redis Server     - основной Redis"
    echo "2. Redis Monitor    - мониторинг команд"
    echo "3. WS Server        - WebSocket сервер"
    echo "4. Bot              - торговый бот"
    echo "5. WS Client        - WebSocket клиент"
    echo ""
    echo "Для остановки всех сервисов запустите:"
    echo "  ./stop-services.sh"
    echo ""
    echo "========================================"
    
    # Показываем финальный статус
    sleep 3
    show_status
}

# Запускаем основную функцию
main
#!/bin/bash

echo "🧹 Очистка репозитория от лишних файлов..."
echo ""

# Дубликаты systemd
echo "Удаляем дубликаты systemd..."
rm -f dtrader-bot.service

# Дубликаты kill скриптов
echo "Удаляем дубликаты kill скриптов..."
rm -f kill-all
rm -f kill-all.sh

# Дубликаты monitor
echo "Удаляем дубликаты monitor..."
rm -f monitor

# Пустые/тестовые файлы
echo "Удаляем пустые/тестовые файлы..."
rm -f ts-node
rm -f test-ssh.txt

# Удаляем restart-services.sh и stop-services.sh (вариант A)
echo "Удаляем restart-services.sh и stop-services.sh..."
rm -f restart-services.sh
rm -f stop-services.sh

echo ""
echo "✅ Очистка завершена!"
echo ""

# Показываем что осталось
echo "📂 Файлы в корне проекта:"
ls -lah | grep -v "node_modules" | grep -v ".git" | grep -v "^d" | tail -n +4

echo ""
echo "📁 Директории:"
ls -d */ | grep -v "node_modules"


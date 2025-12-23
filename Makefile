# Makefile (работает на Linux, Mac, Windows с Git Bash)
.PHONY: help start stop install

help:
	@echo "Команды:"
	@echo "  make install  - установить зависимости"
	@echo "  make start    - запустить все сервисы"
	@echo "  make stop     - остановить все"
	@echo "  make logs     - посмотреть логи"

install:
	@echo "Устанавливаем зависимости..."
	cd bot && npm install
	cd strategy && pip install -r requirements.txt
	cd trader && pip install -r requirements.txt

start:
	@echo "Запускаем Redis..."
	redis-server --daemonize yes
	@echo "Запускаем бота..."
	cd bot && npm start &
	@echo "Запускаем стратегию..."
	cd strategy && python main.py &
	@echo "Запускаем трейдера..."
	cd trader && python trader.py &
	@echo "✅ Все сервисы запущены!"
	@echo "Для остановки: make stop"

stop:
	@echo "Останавливаем все..."
	-pkill -f redis-server
	-pkill -f node
	-pkill -f python
	@echo "✅ Все остановлено"

logs:
	@echo "Логи бота:"
	tail -f bot/logs/app.log
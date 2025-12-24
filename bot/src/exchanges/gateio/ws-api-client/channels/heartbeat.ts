import WebSocket from "ws";

/**
 * Конфигурация для Heartbeat
 */
export interface HeartbeatConfig {
  pingInterval: number; // Интервал ping в мс (по умолчанию 15000)
  pongTimeout: number; // Таймаут ожидания pong в мс (по умолчанию 3000)
  onPongReceived?: () => void; // Callback при получении pong
  onPongTimeout?: () => void; // Callback при timeout pong
  onError?: (error: Error) => void; // Callback при ошибке
}

/**
 * Класс для управления Ping-Pong механизмом WebSocket
 * 
 * Реализует механизм из документации Gate.io:
 * - Отправляет ping каждые 15 секунд
 * - Ожидает ответ с channel: "spot.pong" в течение 3 секунд
 * - При отсутствии ответа вызывает reconnect
 */
export class WsHeartbeat {
  private ws: WebSocket | null = null;
  private config: Required<HeartbeatConfig>;
  private pingIntervalId: NodeJS.Timeout | null = null;
  private pongTimeoutId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastPongTime: number = 0;
  private waitingForPong: boolean = false;

  constructor(config: HeartbeatConfig) {
    this.config = {
      pingInterval: config.pingInterval || 15000,
      pongTimeout: config.pongTimeout || 3000,
      onPongReceived: config.onPongReceived || (() => {}),
      onPongTimeout: config.onPongTimeout || (() => {}),
      onError: config.onError || (() => {}),
    };
  }

  /**
   * Запуск Heartbeat механизма
   */
  start(ws: WebSocket): void {
    if (this.isRunning) {
      console.warn("⚠️  Heartbeat уже запущен");
      return;
    }

    this.ws = ws;
    this.isRunning = true;
    this.lastPongTime = Date.now();

    console.log("💓 Heartbeat запущен");
    console.log(`   Ping интервал: ${this.config.pingInterval}ms`);
    console.log(`   Pong timeout: ${this.config.pongTimeout}ms`);

    // Запускаем периодическую отправку ping
    this.pingIntervalId = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);
  }

  /**
   * Остановка Heartbeat механизма
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log("💔 Остановка Heartbeat");

    // Очищаем таймеры
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }

    this.isRunning = false;
    this.waitingForPong = false;
    this.ws = null;
  }

  /**
   * Отправка ping на сервер
   */
  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("⚠️  WebSocket не готов для ping");
      return;
    }

    try {
      // Отправляем Application-level ping (как в документации)
      const pingMessage = {
        time: Math.floor(Date.now() / 1000),
        channel: "spot.ping",
      };

      this.ws.send(JSON.stringify(pingMessage));
      console.log("🏓 Ping отправлен");

      // Устанавливаем флаг ожидания pong
      this.waitingForPong = true;

      // Запускаем таймер ожидания pong
      this.startPongTimer();
    } catch (error) {
      const err = error as Error;
      console.error("❌ Ошибка отправки ping:", err.message);
      this.config.onError(err);
    }
  }

  /**
   * Запуск таймера ожидания pong
   */
  private startPongTimer(): void {
    // Очищаем предыдущий таймер если есть
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
    }

    // Создаём новый таймер
    this.pongTimeoutId = setTimeout(() => {
      if (this.waitingForPong) {
        console.error("❌ Pong timeout! Нет ответа от сервера");
        this.handlePongTimeout();
      }
    }, this.config.pongTimeout);
  }

  /**
   * Обработка получения pong (вызывается извне из ws-manager)
   */
  handlePongReceived(): void {
    if (!this.waitingForPong) {
      return;
    }

    // Сбрасываем флаг ожидания
    this.waitingForPong = false;

    // Очищаем таймер ожидания
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }

    const now = Date.now();
    const latency = now - this.lastPongTime;
    this.lastPongTime = now;

    console.log(`✅ Pong получен (latency: ${latency}ms)`);
    this.config.onPongReceived();
  }

  /**
   * Обработка timeout pong
   */
  private handlePongTimeout(): void {
    console.error("💀 Pong timeout - соединение потеряно!");
    this.config.onPongTimeout();
    this.stop();
  }

  /**
   * Получить время последнего pong
   */
  getLastPongTime(): number {
    return this.lastPongTime;
  }

  /**
   * Проверка активности Heartbeat
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export default WsHeartbeat;

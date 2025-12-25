import WebSocket from "ws";
import { WsHeartbeat } from "./channels/heartbeat";

/**
 * Конфигурация WebSocket Manager
 */
export interface WsManagerConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

/**
 * Статус соединения
 */
export enum ConnectionStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING",
  FAILED = "FAILED",
}

/**
 * Менеджер WebSocket соединений для Gate.io
 */
export class WsManager {
  private config: Required<WsManagerConfig>;
  private ws: WebSocket | null = null;
  private heartbeat: WsHeartbeat | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: WsManagerConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      pingInterval: config.pingInterval || 15000,
      pongTimeout: config.pongTimeout || 3000,
    };
  }

  async connect(): Promise<void> {
    if (this.status === ConnectionStatus.CONNECTED) {
      console.warn("⚠️  Уже подключены");
      return;
    }

    if (this.status === ConnectionStatus.CONNECTING) {
      console.warn("⚠️  Подключение уже в процессе");
      return;
    }

    this.status = ConnectionStatus.CONNECTING;
    console.log("🔌 Подключение к WebSocket...");
    console.log(`   URL: ${this.config.url}`);

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.on("open", () => this.handleOpen());
      this.ws.on("message", (data: WebSocket.Data) => this.handleMessage(data));
      this.ws.on("error", (error: Error) => this.handleError(error));
      this.ws.on("close", (code: number, reason: Buffer) =>
        this.handleClose(code, reason)
      );
    } catch (error) {
      const err = error as Error;
      console.error("❌ Ошибка подключения:", err.message);
      this.handleConnectionFailure();
    }
  }

  disconnect(): void {
    console.log("🔌 Отключение от WebSocket...");

    if (this.heartbeat) {
      this.heartbeat.stop();
      this.heartbeat = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, "Normal closure");
      }
      this.ws = null;
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    console.log("✅ Отключено");
  }

  send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket не подключен");
      return false;
    }

    try {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      const err = error as Error;
      console.error("❌ Ошибка отправки:", err.message);
      return false;
    }
  }

  onMessage(channel: string, handler: (data: any) => void): void {
    this.messageHandlers.set(channel, handler);
    console.log(`📡 Зарегистрирован обработчик для канала: ${channel}`);
  }

  offMessage(channel: string): void {
    this.messageHandlers.delete(channel);
    console.log(`📡 Удалён обработчик для канала: ${channel}`);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  private handleOpen(): void {
    console.log("✅ WebSocket подключен!");
    this.status = ConnectionStatus.CONNECTED;
    this.reconnectAttempts = 0;

    this.startHeartbeat();
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      console.log("🔍 DEBUG: Получено сообщение");
      console.log("   Channel:", message.channel);
      console.log("   Event:", message.event);

      // Обрабатываем pong ответ от сервера
      if (message.channel && message.channel.endsWith(".pong")) {
        console.log("✅ Это PONG сообщение!");
        if (this.heartbeat) {
          this.heartbeat.handlePongReceived();
        }

        // Проверяем есть ли обработчик для этого канала
        console.log("🔍 Поиск обработчика для:", message.channel);
        console.log("🔍 Зарегистрированные обработчики:", Array.from(this.messageHandlers.keys()));
        
        const handler = this.messageHandlers.get(message.channel);
        if (handler) {
          console.log("✅ Обработчик найден! Вызываем...");
          handler(message);
        } else {
          console.warn("⚠️  Обработчик НЕ найден для канала:", message.channel);
        }
        return;
      }

      // Логируем только важные сообщения (не ping)
      if (message.channel && !message.channel.endsWith(".ping")) {
        console.log("📨 Получено сообщение:", {
          channel: message.channel,
          event: message.event,
        });
      }

      // Вызываем обработчик для канала
      const handler = this.messageHandlers.get(message.channel);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      const err = error as Error;
      console.error("❌ Ошибка парсинга сообщения:", err.message);
    }
  }

  private handleError(error: Error): void {
    console.error("❌ WebSocket ошибка:", error.message);
  }

  private handleClose(code: number, reason: Buffer): void {
    console.log("🔌 WebSocket закрыт");
    console.log(`   Code: ${code}`);
    console.log(`   Reason: ${reason.toString() || "No reason"}`);

    if (this.heartbeat) {
      this.heartbeat.stop();
      this.heartbeat = null;
    }

    if (code !== 1000) {
      this.handleConnectionFailure();
    } else {
      this.status = ConnectionStatus.DISCONNECTED;
    }
  }

  private handleConnectionFailure(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(
        `❌ Превышено максимальное количество попыток переподключения (${this.config.maxReconnectAttempts})`
      );
      this.status = ConnectionStatus.FAILED;
      return;
    }

    this.reconnectAttempts++;
    this.status = ConnectionStatus.RECONNECTING;

    const delay = this.config.reconnectInterval * this.reconnectAttempts;
    console.log(
      `🔄 Попытка переподключения ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} через ${delay}ms`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (!this.ws) return;

    this.heartbeat = new WsHeartbeat({
      channel: this.getPingChannel(),
      pingInterval: this.config.pingInterval,
      pongTimeout: this.config.pongTimeout,
      onPongReceived: () => {
        // Pong получен - всё ок
      },
      onPongTimeout: () => {
        console.error("💀 Heartbeat timeout - переподключение...");
        this.disconnect();
        this.handleConnectionFailure();
      },
      onError: (error) => {
        console.error("❌ Heartbeat ошибка:", error.message);
      },
    });

    this.heartbeat.start(this.ws);
  }

  private getPingChannel(): string {
    if (this.config.url.includes("fx-ws")) {
      return "futures.ping";
    }
    return "spot.ping";
  }
}

export default WsManager;

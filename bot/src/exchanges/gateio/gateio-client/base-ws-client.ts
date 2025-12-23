import { WebSocket } from 'ws';

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  AUTHENTICATED = 'AUTHENTICATED',
  ERROR = 'ERROR',
  SHUTTING_DOWN = 'SHUTTING_DOWN'
}

export interface BaseWebSocketConfig {
  url: string;
  pingInterval?: number;
  pingTimeout?: number;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  name?: string;
}

export abstract class BaseGateIOWebSocket {
  protected socket?: WebSocket;
  protected status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  protected wsUrl: string;
  protected pingIntervalMs: number;
  protected pingTimeoutMs: number;
  protected maxReconnectAttempts: number;
  protected reconnectDelay: number;
  protected reconnectAttempts: number = 0;
  protected clientName: string;
  
  private pingInterval?: NodeJS.Timeout;
  private pingTimeout?: NodeJS.Timeout;

  constructor(config: BaseWebSocketConfig) {
    this.wsUrl = config.url;
    this.pingIntervalMs = config.pingInterval || 15000;
    this.pingTimeoutMs = config.pingTimeout || 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.reconnectDelay = config.reconnectDelay || 1000;
    this.clientName = config.name || 'GateIO-WS';
    
    console.log(`✅ ${this.clientName}: Базовый клиент инициализирован`);
  }

  public connect(): void {
    if (this.status === ConnectionStatus.SHUTTING_DOWN) {
      console.log(`⚠️  ${this.clientName}: Завершение работы, подключение отменено`);
      return;
    }

    if (this.status === ConnectionStatus.CONNECTED || 
        this.status === ConnectionStatus.CONNECTING) {
      console.log(`⚠️  ${this.clientName}: Уже подключен или подключается`);
      return;
    }

    this.status = ConnectionStatus.CONNECTING;
    console.log(`ℹ️  ${this.clientName}: Установка соединения...`);
    console.log(`ℹ️  ${this.clientName}: URL - ${this.wsUrl}`);

    try {
      this.socket = new WebSocket(this.wsUrl);
      this.setupSocketHandlers();
    } catch (error) {
      console.error(`❌ ${this.clientName}: Ошибка создания соединения:`, error);
      this.handleConnectionError();
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('open', () => {
      console.log(`✅ ${this.clientName}: Соединение установлено`);
      this.status = ConnectionStatus.CONNECTED;
      this.reconnectAttempts = 0;
      this.onOpen();
      this.startPingPong();
    });

    this.socket.on('error', (error: any) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${this.clientName}: Ошибка соединения:`, errorMessage);
      this.status = ConnectionStatus.ERROR;
      this.onError(error);
      this.handleConnectionError();
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString() || 'no reason';
      console.log(`ℹ️  ${this.clientName}: Соединение закрыто (${code}: ${reasonStr})`);
      this.onClose(code, reasonStr);
      this.handleConnectionClose();
    });

    this.socket.on('message', (data: Buffer) => {
      this.handleMessage(data);
    });
  }

  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      if (this.isPongMessage(message)) {
        console.log(`ℹ️  ${this.clientName}: Получен pong (соединение активно)`);
        this.resetPingTimeout();
        this.onPong(message);
        return;
      }

      this.onMessage(message);
    } catch (error) {
      console.error(`❌ ${this.clientName}: Ошибка обработки сообщения:`, error);
    }
  }

  private startPingPong(): void {
    this.stopPingPong();

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.pingIntervalMs);

    console.log(`ℹ️  ${this.clientName}: Ping-pong запущен (интервал: ${this.pingIntervalMs}ms)`);
  }

  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
    }
  }

  protected sendPing(): void {
    if (!this.socket || this.status !== ConnectionStatus.CONNECTED) {
      console.log(`⚠️  ${this.clientName}: Не могу отправить ping - соединение не активно`);
      return;
    }

    const pingMessage = this.createPingMessage();

    try {
      this.socket.send(JSON.stringify(pingMessage));
      console.log(`ℹ️  ${this.clientName}: Отправлен ping`);
      this.setupPingTimeout();
    } catch (error) {
      console.error(`❌ ${this.clientName}: Ошибка отправки ping:`, error);
      this.handleConnectionError();
    }
  }

  private setupPingTimeout(): void {
    this.pingTimeout = setTimeout(() => {
      console.error(`❌ ${this.clientName}: Таймаут ожидания pong`);
      this.handleConnectionError();
    }, this.pingTimeoutMs);
  }

  private resetPingTimeout(): void {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
    }
  }

  private handleConnectionError(): void {
    if (this.status === ConnectionStatus.SHUTTING_DOWN) {
      return;
    }

    this.status = ConnectionStatus.ERROR;
    this.stopPingPong();

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `❌ ${this.clientName}: Превышено максимальное количество попыток (${this.maxReconnectAttempts})`
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      60000
    );

    console.log(
      `⚠️  ${this.clientName}: Переподключение ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleConnectionClose(): void {
    if (this.status === ConnectionStatus.SHUTTING_DOWN) {
      console.log(`✅ ${this.clientName}: Соединение закрыто (нормальное завершение)`);
      return;
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.stopPingPong();
    this.handleConnectionError();
  }

  public disconnect(): void {
    this.status = ConnectionStatus.SHUTTING_DOWN;
    this.stopPingPong();

    if (this.socket) {
      try {
        this.socket.close();
        console.log(`✅ ${this.clientName}: Соединение закрыто`);
      } catch (error) {
        console.error(`❌ ${this.clientName}: Ошибка при закрытии:`, error);
      }
    }

    this.status = ConnectionStatus.DISCONNECTED;
  }

  public isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED || 
           this.status === ConnectionStatus.AUTHENTICATED;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  protected sendMessage(message: any): void {
    if (!this.socket || !this.isConnected()) {
      console.log(`⚠️  ${this.clientName}: Не могу отправить сообщение - не подключен`);
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`❌ ${this.clientName}: Ошибка отправки сообщения:`, error);
    }
  }

  protected abstract createPingMessage(): any;
  protected abstract isPongMessage(message: any): boolean;
  protected abstract onOpen(): void;
  protected abstract onMessage(message: any): void;
  
  protected onError(_error: any): void {}
  protected onClose(_code: number, _reason: string): void {}
  protected onPong(_message: any): void {}
}

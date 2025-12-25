import WebSocket, { WebSocketServer } from 'ws';

/**
 * Конфигурация WebSocket Server
 */
export interface WsServerConfig {
  port: number;
}

/**
 * WebSocket Server для broadcasting клиентам
 */
export class WsServer {
  private wss: WebSocketServer | null = null;
  private config: WsServerConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(config: WsServerConfig) {
    this.config = config;
  }

  /**
   * Запуск сервера
   */
  start(): void {
    console.log('📡 Запуск WebSocket Server...');
    console.log(`   Port: ${this.config.port}`);

    this.wss = new WebSocketServer({ port: this.config.port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('❌ WebSocket Server ошибка:', error.message);
    });

    console.log('✅ WebSocket Server запущен!');
    console.log(`   ws://localhost:${this.config.port}`);
  }

  /**
   * Остановка сервера
   */
  stop(): void {
    console.log('📡 Остановка WebSocket Server...');

    // Закрываем все подключения
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('✅ WebSocket Server остановлен');
  }

  /**
   * Обработка нового подключения
   */
  private handleConnection(ws: WebSocket): void {
    console.log('👤 Новое подключение клиента');
    console.log(`   Всего клиентов: ${this.clients.size + 1}`);

    this.clients.add(ws);

    // Отправляем приветственное сообщение
    this.send(ws, {
      type: 'welcome',
      message: 'Connected to DTrader-5.1 WS Server',
      timestamp: Date.now(),
    });

    ws.on('message', (data: Buffer) => {
      console.log('📨 Сообщение от клиента:', data.toString());
    });

    ws.on('close', () => {
      console.log('👤 Клиент отключился');
      this.clients.delete(ws);
      console.log(`   Всего клиентов: ${this.clients.size}`);
    });

    ws.on('error', (error: Error) => {
      console.error('❌ Ошибка клиента:', error.message);
      this.clients.delete(ws);
    });
  }

  /**
   * Отправка сообщения конкретному клиенту
   */
  private send(client: WebSocket, data: any): void {
    if (client.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      client.send(message);
    }
  }

  /**
   * Broadcast сообщения всем клиентам
   */
  broadcast(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    let sent = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });

    console.log(`📤 Broadcast → ${sent} клиентов`);
  }

  /**
   * Получить количество подключенных клиентов
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

export default WsServer;

import WebSocket, { WebSocketServer } from 'ws';
import { createClient, RedisClientType } from 'redis';

export interface WsServerConfig {
  port: number;
  redisHost?: string;
  redisPort?: number;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private config: WsServerConfig;
  private clients: Set<WebSocket> = new Set();
  private redisClient: RedisClientType | null = null;

  constructor(config: WsServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Подключаемся к Redis для чтения state
    if (this.config.redisHost && this.config.redisPort) {
      this.redisClient = createClient({
        socket: {
          host: this.config.redisHost,
          port: this.config.redisPort,
        },
      });
      this.redisClient.on('error', () => {});
      await this.redisClient.connect();
    }

    this.wss = new WebSocketServer({ port: this.config.port });
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
    this.wss.on('error', () => {});
  }

  async stop(): Promise<void> {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });
    this.clients.clear();
    
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    this.clients.add(ws);

    // Приветственное сообщение
    this.send(ws, {
      type: 'welcome',
      message: 'Connected to DTrader-5.1 WS Server',
      timestamp: Date.now(),
    });

    // Отправляем текущий state из Redis
    await this.sendCurrentState(ws);

    ws.on('message', () => {});
    ws.on('close', () => {
      this.clients.delete(ws);
    });
    ws.on('error', () => {
      this.clients.delete(ws);
    });
  }

  private async sendCurrentState(ws: WebSocket): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Пробуем получить state для дефолтного user_id
      // (в реальности нужно будет получить user_id из аутентификации)
      const keys = await this.redisClient.keys('state:account:*');
      
      if (keys.length === 0) return;

      // Берём первый найденный аккаунт
      const accountKey = keys[0];
      const userId = accountKey.split(':')[2];

      // Получаем полный state
      const accountData = await this.redisClient.get(`state:account:${userId}`);
      const balanceData = await this.redisClient.get(`state:balance:${userId}`);
      const positionsData = await this.redisClient.get(`state:positions:${userId}`);

      if (!accountData) return;

      const account = JSON.parse(accountData);
      const balance = balanceData ? JSON.parse(balanceData) : null;
      const positions = positionsData ? JSON.parse(positionsData) : null;

      // Формируем событие INITIAL_STATE
      const stateEvent = {
        event: 'INITIAL_STATE',
        source: 'ws-server',
        level: 'info',
        timestamp: Date.now(),
        data: {
          account,
          balance,
          positions,
        },
      };

      this.send(ws, stateEvent);
    } catch (error) {
      // Игнорируем ошибки
    }
  }

  private send(client: WebSocket, data: any): void {
    if (client.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      client.send(message);
    }
  }

  broadcast(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export default WsServer;

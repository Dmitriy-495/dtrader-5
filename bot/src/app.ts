import * as dotenv from "dotenv";
import { 
  getWalletTotalBalance,
  getUnifiedAccounts,
  getUnifiedPositions 
} from "./exchanges/gateio/rest-api-client/endpoints";
import { WsManager } from "./exchanges/gateio/ws-api-client/ws-manager";
import { RedisPublisher } from "./redis/publisher";
import { EventBuilder, EventLogger } from "./events";

dotenv.config();

class Bot {
  private config = {
    apiKey: process.env.GATEIO_API_KEY || '',
    apiSecret: process.env.GATEIO_API_SECRET || '',
    baseUrl: process.env.BASE_URL_REST || '',
    wsUrl: process.env.BASE_URL_WS || '',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
  };
  
  private wsManager: WsManager | null = null;
  private redisPublisher: RedisPublisher | null = null;
  private eventBuilder: EventBuilder;
  private eventLogger: EventLogger;

  constructor() {
    this.validateConfig();
    this.eventBuilder = new EventBuilder('bot');
    this.eventLogger = new EventLogger();
  }

  private validateConfig(): void {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('❌ API ключи не найдены в .env');
    }
    if (!this.config.baseUrl) {
      throw new Error('❌ BASE_URL_REST не найден в .env');
    }
    if (!this.config.wsUrl) {
      throw new Error('❌ BASE_URL_WS не найден в .env');
    }
  }

  async start(): Promise<void> {
    try {
      await this.startRedis();
      await this.startWebSocket();
      await new Promise(() => {});
    } catch (error) {
      const err = error as Error;
      const event = this.eventBuilder.systemError(err, 'Bot startup');
      this.eventLogger.error(event);
      await this.stop();
      process.exit(1);
    }
  }

  private async startRedis(): Promise<void> {
    this.redisPublisher = new RedisPublisher({
      host: this.config.redisHost,
      port: this.config.redisPort,
    });
    await this.redisPublisher.connect();
  }

  private async startWebSocket(): Promise<void> {
    this.wsManager = new WsManager({
      url: this.config.wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 15000,
      pongTimeout: 3000,
    });

    const isFutures = this.config.wsUrl.includes('fx-ws');
    const pongChannel = isFutures ? 'futures.pong' : 'spot.pong';
    const exchange = 'gate.io';

    this.wsManager.onMessage(pongChannel, async (data) => {
      const receiveTime = Date.now();
      const serverTime = data.time_ms || data.time * 1000;
      const latency = receiveTime - serverTime;

      const event = this.eventBuilder.heartbeatPong(latency, exchange);
      this.eventLogger.log(event);

      if (this.redisPublisher) {
        await this.redisPublisher.publish('system:heartbeat:bot', event);
      }
    });

    await this.wsManager.connect();

    const connectedEvent = this.eventBuilder.wsConnected(this.config.wsUrl);
    this.eventLogger.log(connectedEvent);
    if (this.redisPublisher) {
      await this.redisPublisher.publish('system:events', connectedEvent);
    }
  }

  async stop(): Promise<void> {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }
    if (this.redisPublisher) {
      await this.redisPublisher.disconnect();
    }
  }
}

const bot = new Bot();

process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  await bot.stop();
  process.exit(1);
});

bot.start();

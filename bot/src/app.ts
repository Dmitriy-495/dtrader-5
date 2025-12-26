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

// ============================================
// DTrader-5.1 Bot
// Автономный торговый бот с Event System
// ============================================

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
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🚀 DTrader-5.1 Bot - STARTED! 🚀       ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
      // 1. Подключаемся к Redis
      await this.startRedis();

      // 2. REST API - получаем данные счёта
      console.log('📊 Запрос данных через REST API...');
      await getWalletTotalBalance(this.config);
      await getUnifiedAccounts(this.config);
      await getUnifiedPositions(this.config);

      // 3. WebSocket - подключаемся для real-time данных
      console.log('');
      await this.startWebSocket();

      console.log('');
      console.log('✅ Бот запущен и работает!');
      console.log('   📡 События публикуются в JSON формате');
      console.log('   Нажмите Ctrl+C для остановки');
      console.log('');

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

    // Подписываемся на pong события
    this.wsManager.onMessage(pongChannel, async (data) => {
      const receiveTime = Date.now();
      const serverTime = data.time_ms || data.time * 1000;
      const latency = receiveTime - serverTime;

      // Создаём событие HEARTBEAT_PONG
      const event = this.eventBuilder.heartbeatPong(latency, exchange);
      
      // Логируем в JSON
      this.eventLogger.log(event);

      // Публикуем в Redis
      if (this.redisPublisher) {
        await this.redisPublisher.publish('system:heartbeat:bot', event);
      }
    });

    await this.wsManager.connect();

    // Логируем событие подключения
    const connectedEvent = this.eventBuilder.wsConnected(this.config.wsUrl);
    this.eventLogger.log(connectedEvent);
    if (this.redisPublisher) {
      await this.redisPublisher.publish('system:events', connectedEvent);
    }
  }

  async stop(): Promise<void> {
    console.log('');
    console.log('⚠️  Остановка бота...');

    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    if (this.redisPublisher) {
      await this.redisPublisher.disconnect();
    }

    console.log('✅ Бот остановлен');
  }
}

const bot = new Bot();

process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Необработанная ошибка:', error);
  await bot.stop();
  process.exit(1);
});

bot.start();

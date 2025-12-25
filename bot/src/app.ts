import * as dotenv from "dotenv";
import { 
  getWalletTotalBalance,
  getUnifiedAccounts,
  getUnifiedPositions 
} from "./exchanges/gateio/rest-api-client/endpoints";
import { WsManager } from "./exchanges/gateio/ws-api-client/ws-manager";
import { RedisPublisher } from "./redis/publisher";

// Загружаем переменные окружения
dotenv.config();

// ============================================
// DTrader-5.1 Bot
// Автономный торговый бот с WebSocket + Redis
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

  constructor() {
    this.validateConfig();
  }

  /**
   * Валидация конфигурации
   */
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

  /**
   * Запуск бота
   */
  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🚀 DTrader-5.1 Bot - STARTED! 🚀       ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
      // 1. Подключаемся к Redis
      console.log('🔴 Инициализация Redis Publisher...');
      await this.startRedis();

      // 2. REST API - получаем данные счёта
      console.log('');
      console.log('📊 Запрос данных через REST API...');
      await getWalletTotalBalance(this.config);
      await getUnifiedAccounts(this.config);
      await getUnifiedPositions(this.config);

      // 3. WebSocket - подключаемся для real-time данных
      console.log('');
      console.log('🔌 Подключение к WebSocket...');
      await this.startWebSocket();

      console.log('');
      console.log('✅ Бот запущен и работает!');
      console.log('   📡 WebSocket: активен');
      console.log('   🔴 Redis Publisher: активен');
      console.log('   ⏰ Ожидаем pong события (каждые 15 сек)...');
      console.log('   Нажмите Ctrl+C для остановки');

      // Держим процесс активным
      await new Promise(() => {});

    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Запуск Redis Publisher
   */
  private async startRedis(): Promise<void> {
    this.redisPublisher = new RedisPublisher({
      host: this.config.redisHost,
      port: this.config.redisPort,
    });

    await this.redisPublisher.connect();
    
    // Тестовая публикация
    console.log('🧪 Тестовая публикация в Redis...');
    await this.redisPublisher.publish('system:heartbeat:bot', {
      source: 'gate.io',
      type: 'test',
      timestamp: Date.now(),
      message: 'Bot started - test message',
    });
  }

  /**
   * Запуск WebSocket соединения
   */
  private async startWebSocket(): Promise<void> {
    this.wsManager = new WsManager({
      url: this.config.wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 15000,
      pongTimeout: 3000,
    });

    // Определяем тип endpoint
    const isFutures = this.config.wsUrl.includes('fx-ws');
    const pongChannel = isFutures ? 'futures.pong' : 'spot.pong';
    
    console.log(`📡 Подписка на канал: ${pongChannel}`);

    // Подписываемся на pong события и публикуем в Redis
    this.wsManager.onMessage(pongChannel, async (data) => {
      console.log('');
      console.log('🏓 ============================================');
      console.log('🏓 Получен PONG от биржи!');
      console.log('🏓 Публикуем в Redis канал: system:heartbeat:bot');
      console.log('🏓 ============================================');
      
      if (this.redisPublisher) {
        const payload = {
          source: 'gate.io',
          type: 'pong',
          channel: pongChannel,
          timestamp: Date.now(),
          data: data,
        };
        
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        await this.redisPublisher.publish('system:heartbeat:bot', payload);
        console.log('✅ Опубликовано в Redis!');
      } else {
        console.error('❌ Redis Publisher не инициализирован!');
      }
      console.log('');
    });

    await this.wsManager.connect();
  }

  /**
   * Остановка бота
   */
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

// Точка входа
const bot = new Bot();

// Обработка Ctrl+C
process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

// Обработка ошибок
process.on('uncaughtException', async (error) => {
  console.error('❌ Необработанная ошибка:', error);
  await bot.stop();
  process.exit(1);
});

// Запуск
bot.start();

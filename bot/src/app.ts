import * as dotenv from "dotenv";
import { 
  getWalletTotalBalance,
  getUnifiedAccounts,
  getUnifiedPositions 
} from "./exchanges/gateio/rest-api-client/endpoints";
import { WsManager } from "./exchanges/gateio/ws-api-client/ws-manager";

// Загружаем переменные окружения
dotenv.config();

// ============================================
// DTrader-5.1 Bot
// Автономный торговый бот с WebSocket
// ============================================

class Bot {
  private config = {
    apiKey: process.env.GATEIO_API_KEY || '',
    apiSecret: process.env.GATEIO_API_SECRET || '',
    baseUrl: process.env.BASE_URL_REST || '',
    wsUrl: process.env.BASE_URL_WS || '',
  };
  
  private wsManager: WsManager | null = null;

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
      // 1. REST API - получаем данные счёта
      console.log('📊 Запрос данных через REST API...');
      await getWalletTotalBalance(this.config);
      await getUnifiedAccounts(this.config);
      await getUnifiedPositions(this.config);

      // 2. WebSocket - подключаемся для real-time данных
      console.log('');
      console.log('🔌 Подключение к WebSocket...');
      await this.startWebSocket();

      console.log('');
      console.log('✅ Бот запущен и работает!');
      console.log('   Нажмите Ctrl+C для остановки');

      // Держим процесс активным
      await new Promise(() => {});

    } catch (error) {
      console.error('❌ Критическая ошибка');
      this.stop();
      process.exit(1);
    }
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

    // Регистрируем обработчики для каналов
    // TODO: добавить обработчики для orderbook, trades, balance, positions

    await this.wsManager.connect();
  }

  /**
   * Остановка бота
   */
  stop(): void {
    console.log('');
    console.log('⚠️  Остановка бота...');

    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    console.log('✅ Бот остановлен');
  }
}

// Точка входа
const bot = new Bot();

// Обработка Ctrl+C
process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  bot.stop();
  process.exit(1);
});

// Запуск
bot.start();

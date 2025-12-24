import * as dotenv from 'dotenv';
import { 
  getWalletTotalBalance,
  getUnifiedAccounts,
  getUnifiedPositions 
} from './exchanges/gateio/rest-api-client/endpoints';

// Загружаем переменные окружения
dotenv.config();

// ============================================
// DTrader-5.1 Bot
// Минималистичный координатор
// ============================================

class Bot {
  private config = {
    apiKey: process.env.GATEIO_API_KEY || '',
    apiSecret: process.env.GATEIO_API_SECRET || '',
    baseUrl: process.env.BASE_URL_REST || '',
  };

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
      // 1. Получаем общий баланс кошелька
      await getWalletTotalBalance(this.config);

      // 2. Получаем информацию об унифицированном счёте
      await getUnifiedAccounts(this.config);

      // 3. Получаем открытые позиции
      await getUnifiedPositions(this.config);

      console.log('✅ Работа завершена успешно!');

    } catch (error) {
      console.error('❌ Критическая ошибка');
      process.exit(1);
    }
  }
}

// Точка входа
const bot = new Bot();
bot.start();

import * as dotenv from 'dotenv';
import { RedisSubscriber } from './redis/subscriber';
import { WsServer } from './websocket/server';

// Загружаем переменные окружения
dotenv.config();

// ============================================
// DTrader-5.1 WS-Server
// Broadcasting Instance
// ============================================

class WsServerApp {
  private config = {
    wsPort: parseInt(process.env.WS_PORT || '2808'),
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
    redisChannels: (process.env.REDIS_CHANNELS || 'system:heartbeat:bot').split(','),
  };

  private redisSubscriber: RedisSubscriber | null = null;
  private wsServer: WsServer | null = null;

  /**
   * Запуск сервера
   */
  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  📡 DTrader-5.1 WS-Server - STARTED! 📡  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
      // 1. Запускаем WebSocket Server
      console.log('📡 Инициализация WebSocket Server...');
      this.startWsServer();

      // 2. Подключаемся к Redis Subscriber
      console.log('');
      console.log('🔴 Инициализация Redis Subscriber...');
      await this.startRedisSubscriber();

      console.log('');
      console.log('✅ WS-Server запущен и работает!');
      console.log(`   📡 WebSocket: ws://localhost:${this.config.wsPort}`);
      console.log('   🔴 Redis Subscriber: активен');
      console.log('   Нажмите Ctrl+C для остановки');

      // Держим процесс активным
      await new Promise(() => {});

    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
      this.stop();
      process.exit(1);
    }
  }

  /**
   * Запуск WebSocket Server
   */
  private startWsServer(): void {
    this.wsServer = new WsServer({
      port: this.config.wsPort,
    });

    this.wsServer.start();
  }

  /**
   * Запуск Redis Subscriber
   */
  private async startRedisSubscriber(): Promise<void> {
    this.redisSubscriber = new RedisSubscriber({
      host: this.config.redisHost,
      port: this.config.redisPort,
      channels: this.config.redisChannels,
    });

    // Регистрируем обработчик для heartbeat канала
    this.redisSubscriber.onMessage('system:heartbeat:bot', (message) => {
      console.log('🏓 Получен heartbeat от Bot, broadcast клиентам...');
      
      // Broadcast всем подключенным клиентам
      if (this.wsServer) {
        this.wsServer.broadcast({
          channel: 'system:heartbeat:bot',
          data: JSON.parse(message),
          timestamp: Date.now(),
        });
      }
    });

    await this.redisSubscriber.connect();
  }

  /**
   * Остановка сервера
   */
  async stop(): Promise<void> {
    console.log('');
    console.log('⚠️  Остановка WS-Server...');

    if (this.wsServer) {
      this.wsServer.stop();
    }

    if (this.redisSubscriber) {
      await this.redisSubscriber.disconnect();
    }

    console.log('✅ WS-Server остановлен');
  }
}

// Точка входа
const app = new WsServerApp();

// Обработка Ctrl+C
process.on('SIGINT', async () => {
  await app.stop();
  process.exit(0);
});

// Обработка ошибок
process.on('uncaughtException', async (error) => {
  console.error('❌ Необработанная ошибка:', error);
  await app.stop();
  process.exit(1);
});

// Запуск
app.start();

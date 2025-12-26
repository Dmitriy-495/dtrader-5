import * as dotenv from 'dotenv';
import { RedisSubscriber } from './redis/subscriber';
import { WsServer } from './websocket/server';
import { EventBuilder, EventLogger } from './events';

dotenv.config();

// ============================================
// DTrader-5.1 WS-Server
// Broadcasting Instance with Event System
// ============================================

class WsServerApp {
  private config = {
    wsPort: parseInt(process.env.WS_PORT || '2808'),
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
    redisChannels: (process.env.REDIS_CHANNELS || 'system:heartbeat:bot,system:events').split(','),
  };

  private redisSubscriber: RedisSubscriber | null = null;
  private wsServer: WsServer | null = null;
  private eventBuilder: EventBuilder;
  private eventLogger: EventLogger;

  constructor() {
    this.eventBuilder = new EventBuilder('ws-server');
    this.eventLogger = new EventLogger();
  }

  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  📡 DTrader-5.1 WS-Server - STARTED! 📡  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
      // 1. Запускаем WebSocket Server
      this.startWsServer();

      // 2. Подключаемся к Redis Subscriber
      console.log('');
      await this.startRedisSubscriber();

      console.log('');
      console.log('✅ WS-Server запущен и работает!');
      console.log(`   📡 WebSocket: ws://localhost:${this.config.wsPort}`);
      console.log('   🔴 Redis Subscriber: активен');
      console.log('   📡 События в JSON формате');
      console.log('   Нажмите Ctrl+C для остановки');
      console.log('');

      await new Promise(() => {});

    } catch (error) {
      const err = error as Error;
      const event = this.eventBuilder.systemError(err, 'WS-Server startup');
      this.eventLogger.error(event);
      this.stop();
      process.exit(1);
    }
  }

  private startWsServer(): void {
    console.log('📡 Инициализация WebSocket Server...');
    this.wsServer = new WsServer({
      port: this.config.wsPort,
    });

    this.wsServer.start();
  }

  private async startRedisSubscriber(): Promise<void> {
    console.log('🔴 Инициализация Redis Subscriber...');
    this.redisSubscriber = new RedisSubscriber({
      host: this.config.redisHost,
      port: this.config.redisPort,
      channels: this.config.redisChannels,
    });

    // Обработчик для всех событий
    this.config.redisChannels.forEach(channel => {
      this.redisSubscriber!.onMessage(channel, (message) => {
        try {
          const event = JSON.parse(message);
          
          // Логируем полученное событие
          this.eventLogger.log({
            event: 'REDIS_MESSAGE_RECEIVED',
            source: 'ws-server',
            level: 'info',
            timestamp: Date.now(),
            data: {
              channel,
              original_event: event.event,
              original_source: event.source,
            },
            metadata: {
              session_id: this.eventBuilder['sessionId'],
            },
          });

          // Broadcast всем подключенным клиентам
          if (this.wsServer) {
            this.wsServer.broadcast(event);
          }
        } catch (error) {
          const err = error as Error;
          const errorEvent = this.eventBuilder.systemError(err, 'Message parsing');
          this.eventLogger.error(errorEvent);
        }
      });
    });

    await this.redisSubscriber.connect();
  }

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

const app = new WsServerApp();

process.on('SIGINT', async () => {
  await app.stop();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Необработанная ошибка:', error);
  await app.stop();
  process.exit(1);
});

app.start();

import { createClient, RedisClientType } from 'redis';

/**
 * Конфигурация Redis Publisher
 */
export interface RedisPublisherConfig {
  host: string;
  port: number;
}

/**
 * Redis Publisher для публикации событий
 */
export class RedisPublisher {
  private client: RedisClientType | null = null;
  private config: RedisPublisherConfig;
  private isConnected: boolean = false;

  constructor(config: RedisPublisherConfig) {
    this.config = config;
  }

  /**
   * Подключение к Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('⚠️  Redis уже подключен');
      return;
    }

    console.log('🔴 Подключение к Redis...');
    console.log(`   Host: ${this.config.host}`);
    console.log(`   Port: ${this.config.port}`);

    try {
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis ошибка:', err.message);
      });

      this.client.on('connect', () => {
        console.log('🔴 Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('🔴 Redis ready!');
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis подключен!');
    } catch (error) {
      const err = error as Error;
      console.error('❌ Ошибка подключения к Redis:', err.message);
      throw error;
    }
  }

  /**
   * Отключение от Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    console.log('🔴 Отключение от Redis...');
    await this.client.quit();
    this.client = null;
    this.isConnected = false;
    console.log('✅ Redis отключен');
  }

  /**
   * Публикация сообщения в канал
   */
  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.error('❌ Redis не подключен');
      return;
    }

    try {
      const payload = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);

      const result = await this.client.publish(channel, payload);
      console.log(`📤 Redis publish → ${channel} (subscribers: ${result})`);
      
      if (result === 0) {
        console.warn('⚠️  Нет подписчиков на канал!');
      }
    } catch (error) {
      const err = error as Error;
      console.error(`❌ Ошибка публикации в ${channel}:`, err.message);
    }
  }

  /**
   * Проверка подключения
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

export default RedisPublisher;

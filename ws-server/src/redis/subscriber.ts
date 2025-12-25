import { createClient, RedisClientType } from 'redis';

/**
 * Конфигурация Redis Subscriber
 */
export interface RedisSubscriberConfig {
  host: string;
  port: number;
  channels: string[]; // Каналы для подписки
}

/**
 * Redis Subscriber для получения событий
 */
export class RedisSubscriber {
  private client: RedisClientType | null = null;
  private config: RedisSubscriberConfig;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, (message: string) => void> = new Map();

  constructor(config: RedisSubscriberConfig) {
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

    console.log('🔴 Подключение к Redis Subscriber...');
    console.log(`   Host: ${this.config.host}`);
    console.log(`   Port: ${this.config.port}`);
    console.log(`   Каналы: ${this.config.channels.join(', ')}`);

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

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis Subscriber подключен!');

      // Подписываемся на каналы
      await this.subscribeToChannels();
    } catch (error) {
      const err = error as Error;
      console.error('❌ Ошибка подключения к Redis:', err.message);
      throw error;
    }
  }

  /**
   * Подписка на каналы
   */
  private async subscribeToChannels(): Promise<void> {
    if (!this.client) return;

    for (const channel of this.config.channels) {
      await this.client.subscribe(channel, (message, channelName) => {
        console.log(`📥 Redis message from ${channelName}`);
        
        // Вызываем обработчик
        const handler = this.messageHandlers.get(channelName);
        if (handler) {
          handler(message);
        }
      });

      console.log(`✅ Подписка на канал: ${channel}`);
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
   * Регистрация обработчика для канала
   */
  onMessage(channel: string, handler: (message: string) => void): void {
    this.messageHandlers.set(channel, handler);
    console.log(`📡 Зарегистрирован обработчик для: ${channel}`);
  }

  /**
   * Проверка подключения
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

export default RedisSubscriber;

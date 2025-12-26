import { createClient, RedisClientType } from 'redis';

export interface RedisPublisherConfig {
  host: string;
  port: number;
}

export class RedisPublisher {
  private client: RedisClientType | null = null;
  private config: RedisPublisherConfig;
  private isConnected: boolean = false;

  constructor(config: RedisPublisherConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
      });

      this.client.on('error', () => {});
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    await this.client.quit();
    this.client = null;
    this.isConnected = false;
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      const payload = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      await this.client.publish(channel, payload);
    } catch (error) {
      // Игнорируем
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export default RedisPublisher;

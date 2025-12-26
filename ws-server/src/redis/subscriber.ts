import { createClient, RedisClientType } from 'redis';

export interface RedisSubscriberConfig {
  host: string;
  port: number;
  channels: string[];
}

export class RedisSubscriber {
  private client: RedisClientType | null = null;
  private config: RedisSubscriberConfig;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, (message: string) => void> = new Map();

  constructor(config: RedisSubscriberConfig) {
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
      await this.subscribeToChannels();
    } catch (error) {
      throw error;
    }
  }

  private async subscribeToChannels(): Promise<void> {
    if (!this.client) return;

    for (const channel of this.config.channels) {
      await this.client.subscribe(channel, (message, channelName) => {
        const handler = this.messageHandlers.get(channelName);
        if (handler) {
          handler(message);
        }
      });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    await this.client.quit();
    this.client = null;
    this.isConnected = false;
  }

  onMessage(channel: string, handler: (message: string) => void): void {
    this.messageHandlers.set(channel, handler);
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export default RedisSubscriber;

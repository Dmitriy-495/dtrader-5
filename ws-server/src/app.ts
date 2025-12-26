import * as dotenv from 'dotenv';
import { RedisSubscriber } from './redis/subscriber';
import { WsServer } from './websocket/server';
import { EventBuilder, EventLogger } from './events';

dotenv.config();

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
    try {
      this.startWsServer();
      await this.startRedisSubscriber();
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
    this.wsServer = new WsServer({
      port: this.config.wsPort,
    });
    this.wsServer.start();
  }

  private async startRedisSubscriber(): Promise<void> {
    this.redisSubscriber = new RedisSubscriber({
      host: this.config.redisHost,
      port: this.config.redisPort,
      channels: this.config.redisChannels,
    });

    this.config.redisChannels.forEach(channel => {
      this.redisSubscriber!.onMessage(channel, (message) => {
        try {
          const event = JSON.parse(message);
          
          const logEvent = this.eventBuilder.create(
            'REDIS_RECEIVED',
            'info',
            {
              channel,
              original_event: event.event,
              original_source: event.source,
            }
          );
          this.eventLogger.log(logEvent);

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
    if (this.wsServer) {
      this.wsServer.stop();
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.disconnect();
    }
  }
}

const app = new WsServerApp();

process.on('SIGINT', async () => {
  await app.stop();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  await app.stop();
  process.exit(1);
});

app.start();

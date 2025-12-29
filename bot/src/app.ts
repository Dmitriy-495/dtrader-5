import * as dotenv from "dotenv";
import { 
  getWalletTotalBalance,
  getUnifiedAccounts,
  getUnifiedPositions 
} from "./exchanges/gateio/rest-api-client/endpoints";
import { WsManager } from "./exchanges/gateio/ws-api-client/ws-manager";
import { RedisPublisher, RedisStateManager } from "./redis";
import { EventBuilder, EventLogger } from "./events";

dotenv.config();

// Очищаем терминал
console.clear();

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
  private stateManager: RedisStateManager | null = null;
  private eventBuilder: EventBuilder;
  private eventLogger: EventLogger;
  private userId: number = 0;

  constructor() {
    this.validateConfig();
    this.eventBuilder = new EventBuilder('bot');
    this.eventLogger = new EventLogger();
  }

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

  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║       🚀 DTrader-5.1 Bot Started 🚀      ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    try {
      await this.startRedis();

      console.log('📊 Account Info:');
      await this.loadAndSaveAccountInfo();
      console.log('');

      await this.startWebSocket();

      console.log('✅ Bot running | Events in JSON format | State saved in Redis');
      console.log('');

      await new Promise(() => {});
    } catch (error) {
      const err = error as Error;
      const event = this.eventBuilder.systemError(err, 'Bot startup');
      this.eventLogger.error(event);
      await this.stop();
      process.exit(1);
    }
  }

  private async loadAndSaveAccountInfo(): Promise<void> {
    try {
      const account = await getUnifiedAccounts(this.config);
      if (!account) {
        console.log('   ⚠️  Failed to load account');
        return;
      }

      this.userId = account.user_id;
      console.log(`   User ID: ${account.user_id}`);
      console.log(`   Equity: ${account.unified_account_total_equity}`);
      console.log(`   Leverage: ${account.leverage}x`);

      if (this.stateManager) {
        await this.stateManager.saveAccountState({
          user_id: account.user_id,
          equity: account.unified_account_total_equity,
          leverage: account.leverage,
          available_margin: account.total_available_margin,
          total_balance: account.unified_account_total,
          currency: 'USDT',
          timestamp: Date.now(),
        });
      }

      const balance = await getWalletTotalBalance(this.config);
      if (balance?.total) {
        console.log(`   Balance: ${balance.total.amount} ${balance.total.currency}`);
        
        if (this.stateManager) {
          await this.stateManager.saveBalance(
            this.userId,
            balance.total.amount,
            balance.total.currency
          );
        }
      }

      const positions = await getUnifiedPositions(this.config);
      if (positions && positions.length > 0) {
        console.log(`   Open positions: ${positions.length}`);
        positions.forEach(pos => {
          const side = pos.size > 0 ? 'LONG' : 'SHORT';
          console.log(`      ${pos.contract} ${side} ${Math.abs(pos.size)} | PnL: ${pos.unrealised_pnl}`);
        });

        if (this.stateManager) {
          const positionsState = positions.map(pos => ({
            contract: pos.contract,
            size: pos.size,
            side: (pos.size > 0 ? 'long' : 'short') as 'long' | 'short',
            entry_price: pos.entry_price,
            mark_price: pos.mark_price,
            unrealised_pnl: pos.unrealised_pnl,
            leverage: pos.leverage,
            margin: pos.margin,
            timestamp: Date.now(),
          }));

          await this.stateManager.savePositions(this.userId, positionsState);
        }
      } else {
        console.log(`   Open positions: 0`);
        
        if (this.stateManager) {
          await this.stateManager.savePositions(this.userId, []);
        }
      }

      if (this.redisPublisher) {
        const stateUpdateEvent = this.eventBuilder.create(
          'STATE_UPDATED',
          'info',
          {
            user_id: this.userId,
            balance: balance?.total.amount,
            positions_count: positions?.length || 0,
          }
        );
        await this.redisPublisher.publish('system:state:update', stateUpdateEvent);
      }

    } catch (error) {
      console.log('   ⚠️  Failed to load account info');
    }
  }

  private async startRedis(): Promise<void> {
    this.redisPublisher = new RedisPublisher({
      host: this.config.redisHost,
      port: this.config.redisPort,
    });
    await this.redisPublisher.connect();

    this.stateManager = new RedisStateManager({
      host: this.config.redisHost,
      port: this.config.redisPort,
    });
    await this.stateManager.connect();
  }

  private async startWebSocket(): Promise<void> {
    this.wsManager = new WsManager({
      url: this.config.wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 15000,
      pongTimeout: 3000,
    });

    const isFutures = this.config.wsUrl.includes('fx-ws');
    const pongChannel = isFutures ? 'futures.pong' : 'spot.pong';
    const exchange = 'gate.io';

    this.wsManager.onMessage(pongChannel, async (data) => {
      const receiveTime = Date.now();
      const serverTime = data.time_ms || data.time * 1000;
      const latency = receiveTime - serverTime;

      const event = this.eventBuilder.heartbeatPong(latency, exchange);
      this.eventLogger.log(event);

      if (this.redisPublisher) {
        await this.redisPublisher.publish('system:heartbeat:bot', event);
      }
    });

    await this.wsManager.connect();

    const connectedEvent = this.eventBuilder.wsConnected(this.config.wsUrl);
    this.eventLogger.log(connectedEvent);
    if (this.redisPublisher) {
      await this.redisPublisher.publish('system:events', connectedEvent);
    }
  }

  async stop(): Promise<void> {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }
    if (this.redisPublisher) {
      await this.redisPublisher.disconnect();
    }
    if (this.stateManager) {
      await this.stateManager.disconnect();
    }
  }
}

const bot = new Bot();

process.on('SIGINT', async () => {
  console.log('');
  console.log('⚠️  Shutting down...');
  await bot.stop();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Critical error:', error.message);
  await bot.stop();
  process.exit(1);
});

bot.start();

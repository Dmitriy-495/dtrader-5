import { BaseGateIOWebSocket } from './base-ws-client';
import { GateIORestClient } from './rest-api-client';
import * as crypto from 'crypto';

export interface Balance {
  currency: string;
  available: string;
  locked: string;
  total: string;
  unrealizedPnl?: string;
  positionMargin?: string;
  orderMargin?: string;
  crossOrderMargin?: string;
  crossAvailable?: string;
}

export interface BalanceUpdate {
  userId: string;
  balances: Balance[];
  timestamp: number;
}

interface BalanceConfig {
  apiKey: string;
  apiSecret: string;
  onBalanceUpdate?: (update: BalanceUpdate) => void;
}

export class BalanceWebSocket extends BaseGateIOWebSocket {
  private apiKey: string;
  private apiSecret: string;
  private userId?: string;
  private onBalanceUpdate?: (update: BalanceUpdate) => void;
  private balances: Map<string, Balance> = new Map();
  private restClient: GateIORestClient;
  private isInitialized: boolean = false;

  constructor(config: BalanceConfig) {
    super({
      url: 'wss://fx-ws.gateio.ws/v4/ws/usdt',
      pingInterval: 15000,
      pingTimeout: 3000,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      name: 'Balance-WS'
    });

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.onBalanceUpdate = config.onBalanceUpdate;
    
    // Создаём REST клиент
    this.restClient = new GateIORestClient({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    });
  }

  /**
   * Получить начальный баланс через REST API
   */
  async initializeBalance(): Promise<void> {
    console.log(`ℹ️  ${this.clientName}: Получение начального баланса через REST API...`);

    try {
      const account = await this.restClient.getFuturesAccount('usdt');
      
      console.log(`✅ ${this.clientName}: Начальный баланс получен`);
      console.log(`   User ID: ${account.user}`);
      console.log(`   Currency: ${account.currency}`);
      console.log(`   Total: ${account.total} USDT`);
      console.log(`   Available: ${account.available} USDT`);
      console.log(`   Position Margin: ${account.position_margin} USDT`);
      console.log(`   Order Margin: ${account.order_margin} USDT`);
      console.log(`   Unrealised PnL: ${account.unrealised_pnl} USDT`);

      // Сохраняем user ID
      this.userId = account.user.toString();

      // Создаём объект баланса
      const balance: Balance = {
        currency: account.currency,
        available: account.available,
        locked: (parseFloat(account.position_margin) + parseFloat(account.order_margin)).toString(),
        total: account.total,
        unrealizedPnl: account.unrealised_pnl,
        positionMargin: account.position_margin,
        orderMargin: account.order_margin,
        crossOrderMargin: account.cross_order_margin,
        crossAvailable: account.cross_available
      };

      // Сохраняем в кеш
      this.balances.set(balance.currency, balance);

      // Публикуем начальное состояние
      const update: BalanceUpdate = {
        userId: this.userId,
        balances: [balance],
        timestamp: Date.now()
      };

      if (this.onBalanceUpdate) {
        this.onBalanceUpdate(update);
      }

      this.isInitialized = true;

      // Пробуем получить позиции (если есть)
      try {
        const positions = await this.restClient.getFuturesPositions('usdt');
        if (positions && positions.length > 0) {
          console.log(`📊 ${this.clientName}: Открытые позиции: ${positions.length}`);
          positions.forEach((pos: any) => {
            if (pos.size !== 0) {
              console.log(`   ${pos.contract}: ${pos.size} @ ${pos.entry_price} (PnL: ${pos.unrealised_pnl})`);
            }
          });
        }
      } catch (error) {
        console.log(`⚠️  ${this.clientName}: Не удалось получить позиции (возможно, их нет)`);
      }

    } catch (error: any) {
      console.error(`❌ ${this.clientName}: Ошибка получения начального баланса:`, error.message);
      throw error;
    }
  }

  protected createPingMessage(): any {
    return {
      time: Math.floor(Date.now() / 1000),
      channel: 'futures.ping'
    };
  }

  protected isPongMessage(message: any): boolean {
    return message.event === 'pong' || message.channel === 'futures.pong';
  }

  protected onOpen(): void {
    console.log(`ℹ️  ${this.clientName}: Аутентификация для подписки на обновления...`);
    this.authenticate();
  }

  protected onMessage(message: any): void {
    // Аутентификация подтверждена
    if (message.channel === 'futures.balances' && message.event === 'subscribe') {
      console.log(`✅ ${this.clientName}: Подписка на обновления баланса подтверждена`);
      return;
    }

    // Обновление баланса
    if (message.event === 'update' && message.channel === 'futures.balances') {
      this.processBalanceUpdate(message);
      return;
    }
  }

  private authenticate(): void {
    const timestamp = Math.floor(Date.now() / 1000);
    const channel = 'futures.balances';
    const event = 'subscribe';

    // Создаём подпись согласно документации Gate.io
    const message = `channel=${channel}&event=${event}&time=${timestamp}`;
    const signature = crypto
      .createHmac('sha512', this.apiSecret)
      .update(message)
      .digest('hex');

    const authMessage = {
      time: timestamp,
      channel,
      event,
      auth: {
        method: 'api_key',
        KEY: this.apiKey,
        SIGN: signature
      }
    };

    this.sendMessage(authMessage);
  }

  private processBalanceUpdate(message: any): void {
    if (!message.result || !Array.isArray(message.result)) {
      return;
    }

    const balances: Balance[] = message.result.map((b: any) => ({
      currency: b.currency || b.text,
      available: b.available || '0',
      locked: b.freeze || '0',
      total: b.balance || '0',
      unrealizedPnl: b.unrealised_pnl,
      positionMargin: b.position_margin,
      orderMargin: b.order_margin
    }));

    // Обновляем кеш
    balances.forEach(balance => {
      this.balances.set(balance.currency, balance);
    });

    const update: BalanceUpdate = {
      userId: this.userId || 'unknown',
      balances,
      timestamp: Date.now()
    };

    // Выводим только значимые изменения
    console.log(`💰 ${this.clientName}: Balance Update (WebSocket)`);
    balances.forEach(b => {
      const total = parseFloat(b.total);
      if (total > 0) {
        console.log(`   ${b.currency}: ${b.total} (available: ${b.available})`);
      }
    });

    if (this.onBalanceUpdate) {
      this.onBalanceUpdate(update);
    }
  }

  public getBalance(currency: string): Balance | null {
    return this.balances.get(currency) || null;
  }

  public getAllBalances(): Balance[] {
    return Array.from(this.balances.values());
  }

  public getUserId(): string | undefined {
    return this.userId;
  }

  public isBalanceInitialized(): boolean {
    return this.isInitialized;
  }
}

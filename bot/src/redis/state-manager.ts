import { RedisClientType, createClient } from 'redis';

/**
 * Конфигурация State Manager
 */
export interface StateManagerConfig {
  host: string;
  port: number;
  userId?: string;
}

/**
 * Структура состояния аккаунта
 */
export interface AccountState {
  user_id: number;
  equity: string;
  leverage: string;
  available_margin: string;
  total_balance: string;
  currency: string;
  timestamp: number;
}

/**
 * Структура позиции
 */
export interface PositionState {
  contract: string;
  size: number;
  side: 'long' | 'short';
  entry_price: string;
  mark_price: string;
  unrealised_pnl: string;
  leverage: string;
  margin: string;
  timestamp: number;
}

/**
 * Redis State Manager - управление состоянием
 */
export class RedisStateManager {
  private client: RedisClientType | null = null;
  private config: Required<StateManagerConfig>;
  private isConnected: boolean = false;

  constructor(config: StateManagerConfig) {
    this.config = {
      host: config.host,
      port: config.port,
      userId: config.userId || 'default',
    };
  }

  /**
   * Подключение к Redis
   */
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

  /**
   * Отключение от Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    await this.client.quit();
    this.client = null;
    this.isConnected = false;
  }

  // ============================================
  // Account State
  // ============================================

  /**
   * Сохранить состояние аккаунта
   */
  async saveAccountState(state: AccountState): Promise<void> {
    if (!this.client) return;

    const key = `state:account:${state.user_id}`;
    await this.client.set(key, JSON.stringify(state), {
      EX: 3600, // TTL 1 час
    });

    // Обновляем timestamp
    await this.updateLastUpdate(state.user_id);
  }

  /**
   * Получить состояние аккаунта
   */
  async getAccountState(userId: number): Promise<AccountState | null> {
    if (!this.client) return null;

    const key = `state:account:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // Balance State
  // ============================================

  /**
   * Сохранить баланс
   */
  async saveBalance(
    userId: number,
    balance: string,
    currency: string
  ): Promise<void> {
    if (!this.client) return;

    const key = `state:balance:${userId}`;
    const data = {
      balance,
      currency,
      timestamp: Date.now(),
    };

    await this.client.set(key, JSON.stringify(data), {
      EX: 3600,
    });

    await this.updateLastUpdate(userId);
  }

  /**
   * Получить баланс
   */
  async getBalance(userId: number): Promise<any | null> {
    if (!this.client) return null;

    const key = `state:balance:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // Positions State
  // ============================================

  /**
   * Сохранить позиции
   */
  async savePositions(
    userId: number,
    positions: PositionState[]
  ): Promise<void> {
    if (!this.client) return;

    const key = `state:positions:${userId}`;
    const data = {
      positions,
      count: positions.length,
      timestamp: Date.now(),
    };

    await this.client.set(key, JSON.stringify(data), {
      EX: 3600,
    });

    await this.updateLastUpdate(userId);
  }

  /**
   * Получить позиции
   */
  async getPositions(userId: number): Promise<any | null> {
    if (!this.client) return null;

    const key = `state:positions:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // Last Update
  // ============================================

  /**
   * Обновить время последнего обновления
   */
  private async updateLastUpdate(userId: number): Promise<void> {
    if (!this.client) return;

    const key = `state:last_update:${userId}`;
    await this.client.set(key, Date.now().toString(), {
      EX: 3600,
    });
  }

  /**
   * Получить время последнего обновления
   */
  async getLastUpdate(userId: number): Promise<number | null> {
    if (!this.client) return null;

    const key = `state:last_update:${userId}`;
    const data = await this.client.get(key);
    return data ? parseInt(data) : null;
  }

  // ============================================
  // Полное состояние
  // ============================================

  /**
   * Получить полное состояние пользователя
   */
  async getFullState(userId: number): Promise<any> {
    const account = await this.getAccountState(userId);
    const balance = await this.getBalance(userId);
    const positions = await this.getPositions(userId);
    const lastUpdate = await this.getLastUpdate(userId);

    return {
      account,
      balance,
      positions,
      last_update: lastUpdate,
    };
  }

  /**
   * Очистить все данные пользователя
   */
  async clearUserState(userId: number): Promise<void> {
    if (!this.client) return;

    const keys = [
      `state:account:${userId}`,
      `state:balance:${userId}`,
      `state:positions:${userId}`,
      `state:last_update:${userId}`,
    ];

    for (const key of keys) {
      await this.client.del(key);
    }
  }

  /**
   * Проверка подключения
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

export default RedisStateManager;

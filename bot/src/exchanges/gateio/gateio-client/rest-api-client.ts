import axios, { AxiosInstance } from 'axios';
import { createGateIOSignature } from '../crypto/signature';

export interface FuturesAccount {
  user: number;
  currency: string;
  total: string;
  unrealised_pnl: string;
  position_margin: string;
  order_margin: string;
  available: string;
  point: string;
  bonus: string;
  in_dual_mode: boolean;
  enable_credit: boolean;
  position_initial_margin: string;
  maintenance_margin: string;
  bonus_max: string;
  cross_order_margin: string;
  cross_initial_margin: string;
  cross_maintenance_margin: string;
  cross_unrealised_pnl: string;
  cross_available: string;
  isolated_position_margin: string;
  enable_evolved_classic: boolean;
}

interface RestAPIConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  timeout?: number;
}

export class GateIORestClient {
  private apiKey: string;
  private apiSecret: string;
  private client: AxiosInstance;

  constructor(config: RestAPIConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.gateio.ws',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Получить баланс фьючерсного аккаунта
   * https://www.gate.io/docs/developers/apiv4/en/\#list-futures-account
   */
  async getFuturesAccount(settle: string = 'usdt'): Promise<FuturesAccount> {
    const method = 'GET';
    const url = `/api/v4/futures/${settle}/accounts`;
    const queryString = '';
    const payloadString = '';

    // Используем проверенную функцию подписи из DTrader-4
    const headers = createGateIOSignature(
      this.apiKey,
      this.apiSecret,
      method,
      url,
      queryString,
      payloadString
    );

    try {
      const response = await this.client.get(`/api/v4/futures/${settle}/accounts`, {
        headers: {
          ...headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Gate.io API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Получить все позиции
   * https://www.gate.io/docs/developers/apiv4/en/\#list-all-positions-of-a-user
   */
  async getFuturesPositions(settle: string = 'usdt'): Promise<any[]> {
    const method = 'GET';
    const url = `/api/v4/futures/${settle}/positions`;
    const queryString = '';
    const payloadString = '';

    const headers = createGateIOSignature(
      this.apiKey,
      this.apiSecret,
      method,
      url,
      queryString,
      payloadString
    );

    try {
      const response = await this.client.get(`/api/v4/futures/${settle}/positions`, {
        headers: {
          ...headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Gate.io API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Проверка подключения (не требует авторизации)
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v4/spot/currencies/BTC');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

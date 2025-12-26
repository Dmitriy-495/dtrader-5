/**
 * Уровни логирования
 */
export type EventLevel = 'info' | 'warn' | 'error';

/**
 * Базовое событие DTrader
 */
export interface DTraderEvent {
  event: string;           // Тип события
  source: string;          // Источник (bot, strategy, trader, etc)
  level: EventLevel;       // Уровень
  timestamp: number;       // Unix timestamp в ms
  data?: any;             // Данные события
  metadata?: {            // Метаданные
    latency?: number;
    exchange?: string;
    session_id?: string;
    [key: string]: any;
  };
}

/**
 * Типы событий системы
 */
export enum EventType {
  // Heartbeat события
  HEARTBEAT_PONG = 'HEARTBEAT_PONG',
  HEARTBEAT_FAIL = 'HEARTBEAT_FAIL',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',

  // WebSocket события
  WS_CONNECTED = 'WS_CONNECTED',
  WS_DISCONNECTED = 'WS_DISCONNECTED',
  WS_RECONNECTING = 'WS_RECONNECTING',
  WS_ERROR = 'WS_ERROR',

  // Market Data события
  ORDERBOOK_UPDATE = 'ORDERBOOK_UPDATE',
  TRADES_UPDATE = 'TRADES_UPDATE',
  BALANCE_UPDATE = 'BALANCE_UPDATE',
  POSITION_UPDATE = 'POSITION_UPDATE',

  // System события
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

import { DTraderEvent, EventLevel, EventType } from './types';

/**
 * Построитель событий
 */
export class EventBuilder {
  private source: string;
  private sessionId: string;

  constructor(source: string, sessionId?: string) {
    this.source = source;
    this.sessionId = sessionId || this.generateSessionId();
  }

  /**
   * Создать событие
   */
  create(
    event: EventType | string,
    level: EventLevel = 'info',
    data?: any,
    metadata?: any
  ): DTraderEvent {
    return {
      event,
      source: this.source,
      level,
      timestamp: Date.now(),
      data,
      metadata: {
        session_id: this.sessionId,
        ...metadata,
      },
    };
  }

  /**
   * HEARTBEAT_PONG событие
   */
  heartbeatPong(latency: number, exchange: string): DTraderEvent {
    return this.create(
      EventType.HEARTBEAT_PONG,
      'info',
      undefined,
      { latency, exchange }
    );
  }

  /**
   * HEARTBEAT_FAIL событие
   */
  heartbeatFail(reason: string, exchange: string): DTraderEvent {
    return this.create(
      EventType.HEARTBEAT_FAIL,
      'error',
      { reason },
      { exchange }
    );
  }

  /**
   * WS_CONNECTED событие
   */
  wsConnected(url: string): DTraderEvent {
    return this.create(
      EventType.WS_CONNECTED,
      'info',
      { url }
    );
  }

  /**
   * WS_DISCONNECTED событие
   */
  wsDisconnected(code: number, reason: string): DTraderEvent {
    return this.create(
      EventType.WS_DISCONNECTED,
      'warn',
      { code, reason }
    );
  }

  /**
   * SYSTEM_ERROR событие
   */
  systemError(error: Error, context?: string): DTraderEvent {
    return this.create(
      EventType.SYSTEM_ERROR,
      'error',
      {
        message: error.message,
        stack: error.stack,
        context,
      }
    );
  }

  /**
   * Генерация Session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default EventBuilder;

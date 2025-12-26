import { DTraderEvent } from './types';

/**
 * Event Logger - логирование событий в JSON формате (одна строка)
 */
export class EventLogger {
  /**
   * Логировать событие
   */
  log(event: DTraderEvent): void {
    console.log(JSON.stringify(event));
  }

  /**
   * Логировать событие в stderr (для ошибок)
   */
  error(event: DTraderEvent): void {
    console.error(JSON.stringify(event));
  }
}

export default EventLogger;

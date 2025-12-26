/**
 * Event Logger - логирование событий в JSON формате (одна строка)
 */
class EventLogger {
  /**
   * Логировать событие
   */
  log(event) {
    console.log(JSON.stringify(event));
  }

  /**
   * Логировать событие в stderr (для ошибок)
   */
  error(event) {
    console.error(JSON.stringify(event));
  }
}

module.exports = { EventLogger };

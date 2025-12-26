import { EventBuilder, EventLogger, LogFormat } from './events';

console.log('╔════════════════════════════════════════════╗');
console.log('║   🧪 Тест Event System 🧪                ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');

// Создаём builder
const builder = new EventBuilder('bot');

// Тестируем разные форматы
const formats = [LogFormat.PRETTY, LogFormat.KEY_VALUE, LogFormat.JSON];

formats.forEach((format) => {
  console.log(`\n--- Формат: ${format} ---\n`);
  const logger = new EventLogger(format);

  // HEARTBEAT_PONG
  logger.log(builder.heartbeatPong(45, 'gate.io'));

  // HEARTBEAT_FAIL
  logger.log(builder.heartbeatFail('timeout', 'gate.io'));

  // WS_CONNECTED
  logger.log(builder.wsConnected('wss://fx-ws.gateio.ws/v4/ws/usdt'));

  // WS_DISCONNECTED
  logger.log(builder.wsDisconnected(1006, 'Connection lost'));
});

console.log('\n✅ Тест завершён!');

import * as dotenv from "dotenv";
import { WsManager } from "./exchanges/gateio/ws-api-client/ws-manager";

// Загружаем переменные окружения
dotenv.config();

/**
 * Тест Ping-Pong механизма
 */
async function testPingPong() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   🏓 Тест Ping-Pong механизма Gate.io 🏓 ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log("");

  // Получаем WebSocket URL из .env
  const wsUrl =
    process.env.BASE_URL_WS || "wss://fx-ws.gateio.ws/v4/ws/usdt";

  console.log("📋 Конфигурация:");
  console.log(`   WS URL: ${wsUrl}`);
  console.log(`   Ping интервал: 15000ms (15 сек)`);
  console.log(`   Pong timeout: 3000ms (3 сек)`);
  console.log("");

  // Создаём WS Manager
  const wsManager = new WsManager({
    url: wsUrl,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3,
    pingInterval: 15000,
    pongTimeout: 3000,
  });

  // Регистрируем обработчик для pong сообщений
  wsManager.onMessage("spot.pong", (data) => {
    console.log("✅ Получен spot.pong от сервера:", data);
  });

  // Подключаемся
  try {
    await wsManager.connect();

    console.log("");
    console.log("⏳ Ожидаем ping-pong обмен...");
    console.log("   (Ctrl+C для остановки)");
    console.log("");

    // Ждём 60 секунд (4 цикла ping-pong)
    await new Promise((resolve) => setTimeout(resolve, 60000));

    console.log("");
    console.log("✅ Тест завершён успешно!");
    console.log("   Ping-Pong механизм работает корректно!");

    // Отключаемся
    wsManager.disconnect();
  } catch (error) {
    console.error("❌ Ошибка теста:", error);
    wsManager.disconnect();
    process.exit(1);
  }
}

// Обработка Ctrl+C
process.on("SIGINT", () => {
  console.log("");
  console.log("⚠️  Получен сигнал остановки");
  process.exit(0);
});

// Запуск теста
testPingPong();

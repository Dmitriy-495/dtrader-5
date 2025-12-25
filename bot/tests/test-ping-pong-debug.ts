import * as dotenv from "dotenv";
import WebSocket from "ws";

// Загружаем переменные окружения
dotenv.config();

/**
 * Отладочный тест - смотрим все сообщения от сервера
 */
async function debugTest() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   🔍 Debug Тест WebSocket Gate.io 🔍     ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log("");

  const wsUrl = process.env.BASE_URL_WS || "wss://fx-ws.gateio.ws/v4/ws/usdt";
  const isFutures = wsUrl.includes("fx-ws");
  const pingChannel = isFutures ? "futures.ping" : "spot.ping";
  
  console.log(`📡 Подключаемся к: ${wsUrl}`);
  console.log(`📡 Тип: ${isFutures ? "Futures" : "Spot"}`);
  console.log(`📡 Ping канал: ${pingChannel}`);
  console.log("");

  const ws = new WebSocket(wsUrl);

  let pingCount = 0;
  let pongCount = 0;

  ws.on("open", () => {
    console.log("✅ WebSocket открыт!");
    console.log("");

    // Функция отправки ping
    const sendPing = () => {
      pingCount++;
      const pingMessage = {
        time: Math.floor(Date.now() / 1000),
        channel: pingChannel,
      };

      console.log(`🏓 Ping #${pingCount} отправлен (${new Date().toLocaleTimeString()})`);
      console.log(JSON.stringify(pingMessage, null, 2));
      console.log("");

      ws.send(JSON.stringify(pingMessage));
    };

    // Отправляем первый ping сразу
    sendPing();

    // Отправляем ещё 2 ping с интервалом 5 секунд
    const interval = setInterval(() => {
      if (pingCount >= 3) {
        clearInterval(interval);
        console.log("✅ Все 3 ping отправлены!");
        console.log(`📊 Статистика: Ping: ${pingCount}, Pong: ${pongCount}`);
        console.log("");
        
        // Закрываем через 2 секунды после последнего ping
        setTimeout(() => {
          ws.close();
        }, 2000);
        return;
      }
      sendPing();
    }, 5000);
  });

  ws.on("message", (data) => {
    const dataStr = data.toString();
    
    try {
      const parsed = JSON.parse(dataStr);
      
      if (parsed.channel && parsed.channel.endsWith(".pong")) {
        pongCount++;
        console.log(`✅ Pong #${pongCount} получен (${new Date().toLocaleTimeString()})`);
        console.log(JSON.stringify(parsed, null, 2));
        console.log("");
      } else {
        console.log("📥 Другое сообщение:");
        console.log(JSON.stringify(parsed, null, 2));
        console.log("");
      }
    } catch (e) {
      console.log("⚠️  Не удалось распарсить JSON:");
      console.log(dataStr);
      console.log("");
    }
  });

  ws.on("error", (error) => {
    console.error("❌ Ошибка:", error.message);
  });

  ws.on("close", (code, reason) => {
    console.log(`🔌 Соединение закрыто: ${code} - ${reason || "No reason"}`);
    console.log("");
    console.log("📊 Финальная статистика:");
    console.log(`   Отправлено Ping: ${pingCount}`);
    console.log(`   Получено Pong: ${pongCount}`);
    console.log(`   Успешность: ${pongCount === pingCount ? "✅ 100%" : `⚠️  ${Math.round(pongCount/pingCount*100)}%`}`);
  });

  // Ждём максимум 20 секунд
  await new Promise((resolve) => setTimeout(resolve, 20000));

  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  console.log("✅ Тест завершён");
}

// Обработка Ctrl+C
process.on("SIGINT", () => {
  console.log("");
  console.log("⚠️  Получен сигнал остановки");
  process.exit(0);
});

debugTest();

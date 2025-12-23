import { ConfigLoader } from "../../shared/lib/typescript/src/config-loader";
import { RedisClient } from "../../shared/lib/typescript/src/redis-client";
``;
import { OrderBookWebSocket } from "./exchanges/gateio/gateio-client/orderbook-ws-client";
import { BalanceWebSocket } from "./exchanges/gateio/gateio-client/balance-ws-client";

// ============================================
// DTrader-5 Bot Service
// ============================================

class BotService {
  private config: ConfigLoader;
  private redis?: RedisClient;
  private orderBookWs?: OrderBookWebSocket;
  private balanceWs?: BalanceWebSocket;
  private isShuttingDown: boolean = false;
  private lastPrintTimes: { [key: string]: number } = {};

  constructor() {
    console.log("🚀 DTrader-5 Bot Service");
    console.log("=".repeat(60));

    this.config = new ConfigLoader({ serviceName: "bot" });

    console.log("✅ Конфигурация загружена");
  }

  async start(): Promise<void> {
    try {
      console.log("🔄 Запуск Bot Service...");

      // Подключение к Redis
      await this.connectRedis();

      // Запуск Order Book WebSocket
      await this.startOrderBook();

      // Запуск Balance WebSocket
      await this.startBalance();

      // Настройка graceful shutdown
      this.setupGracefulShutdown();

      console.log("");
      console.log(
        "╔═══════════════════════════════════════════════════════════════╗"
      );
      console.log(
        "║              ✅ BOT SERVICE ЗАПУЩЕН! ✅                      ║"
      );
      console.log(
        "╚═══════════════════════════════════════════════════════════════╝"
      );
      console.log("");
      console.log("📊 Мониторинг данных:");
      console.log("   - Order Book: BTC_USDT, ETH_USDT");
      console.log("   - Balance: Futures Account");
      console.log("");
      console.log("Нажмите Ctrl+C для остановки");
    } catch (error) {
      console.error("❌ Ошибка запуска Bot Service:", error);
      process.exit(1);
    }
  }

  private async connectRedis(): Promise<void> {
    console.log("🔴 Подключение к Redis...");

    const redisConfig = this.config.get("redis");
    this.redis = new RedisClient(redisConfig);

    await this.redis.connect();
    console.log("✅ Redis подключен");
  }

  private async startOrderBook(): Promise<void> {
    const orderbookConfig = this.config.get("data_collection.orderbook");

    if (!orderbookConfig?.enabled) {
      console.log("⚠️  Order Book отключен в конфигурации");
      return;
    }

    console.log("📊 Запуск Order Book WebSocket...");

    this.orderBookWs = new OrderBookWebSocket({
      depth: orderbookConfig.depth,
      updateSpeed: orderbookConfig.update_speed,
      onOrderBookUpdate: (update) => this.handleOrderBookUpdate(update),
      onBestBidAsk: (data) => this.handleBestBidAsk(data),
    });

    this.orderBookWs.connect();

    // Подписка на пары
    const pairs = orderbookConfig.pairs || [];
    console.log(`📡 Подписка на пары: ${pairs.join(", ")}`);

    // Даём время на подключение
    await this.sleep(2000);

    pairs.forEach((pair: string) => {
      this.orderBookWs?.subscribeToPair(pair);
    });

    console.log("✅ Order Book WebSocket запущен");
  }

  private async startBalance(): Promise<void> {
    const balanceConfig = this.config.get("data_collection.balance");

    if (!balanceConfig?.enabled) {
      console.log("⚠️  Balance отключен в конфигурации");
      return;
    }

    console.log("💰 Запуск Balance WebSocket...");

    const apiKey = this.config.get("exchange.api_key");
    const apiSecret = this.config.get("exchange.api_secret");

    if (!apiKey || !apiSecret) {
      console.error("❌ API ключи не найдены в конфигурации!");
      console.log("⚠️  Balance WebSocket не запущен");
      return;
    }

    this.balanceWs = new BalanceWebSocket({
      apiKey,
      apiSecret,
      onBalanceUpdate: (update) => this.handleBalanceUpdate(update),
    });

    this.balanceWs.connect();

    // Получаем начальный баланс через REST API
    try {
      await this.balanceWs.initializeBalance();
    } catch (error) {
      console.log("⚠️  Не удалось получить начальный баланс через REST API");
      console.log("   Ожидаем обновления через WebSocket...");
    }

    console.log("✅ Balance WebSocket запущен");
  }

  private async handleOrderBookUpdate(update: any): Promise<void> {
    // Публикуем в Redis
    if (this.redis) {
      const channel = this.config
        .get("publishing.redis.channels.orderbook")
        .replace("{pair}", update.contract);

      await this.redis.publish(channel, update);
    }

    // Выводим статистику каждые 10 секунд
    const now = Date.now();
    const key = `orderbook_stats_${update.contract}`;

    if (!this.lastPrintTimes[key] || now - this.lastPrintTimes[key] > 10000) {
      console.log("");
      console.log(`📊 Order Book Update: ${update.contract}`);
      console.log(
        `   Bids: ${update.bids.length} уровней | Asks: ${update.asks.length} уровней`
      );

      if (update.bids.length > 0) {
        console.log(`   Top 3 Bids:`);
        update.bids.slice(0, 3).forEach((bid: [string, string], i: number) => {
          console.log(`     ${i + 1}. Price: ${bid[0]}, Size: ${bid[1]}`);
        });
      }

      if (update.asks.length > 0) {
        console.log(`   Top 3 Asks:`);
        update.asks.slice(0, 3).forEach((ask: [string, string], i: number) => {
          console.log(`     ${i + 1}. Price: ${ask[0]}, Size: ${ask[1]}`);
        });
      }

      this.lastPrintTimes[key] = now;
    }
  }

  private async handleBestBidAsk(data: any): Promise<void> {
    // Выводим best bid/ask раз в 5 секунд для каждой пары
    const now = Date.now();
    const key = `bestbidask_${data.contract}`;

    if (!this.lastPrintTimes[key] || now - this.lastPrintTimes[key] > 5000) {
      const bidPrice = data.bestBid?.price || "N/A";
      const askPrice = data.bestAsk?.price || "N/A";
      const spread = data.spread.toFixed(2);
      const spreadPercent = data.spreadPercent.toFixed(4);

      console.log(
        `💹 ${data.contract}: Bid ${bidPrice} | Ask ${askPrice} | Spread: $${spread} (${spreadPercent}%)`
      );

      this.lastPrintTimes[key] = now;
    }
  }

  private async handleBalanceUpdate(update: any): Promise<void> {
    // Публикуем в Redis
    if (this.redis) {
      const channel = this.config.get("publishing.redis.channels.balance");
      await this.redis.publish(channel, update);
    }

    console.log("");
    console.log("💰 Balance Update:");
    update.balances.forEach((balance: any) => {
      const total = parseFloat(balance.total);
      if (total > 0) {
        console.log(
          `   ${balance.currency}: Total ${balance.total} (Available: ${balance.available}, Locked: ${balance.locked})`
        );
        if (balance.unrealizedPnl) {
          console.log(`      Unrealized PnL: ${balance.unrealizedPnl}`);
        }
      }
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log("");
      console.log(`🛑 Получен сигнал ${signal}, завершение работы...`);

      if (this.orderBookWs) {
        console.log("🔌 Отключение Order Book WebSocket...");
        this.orderBookWs.disconnect();
      }

      if (this.balanceWs) {
        console.log("🔌 Отключение Balance WebSocket...");
        this.balanceWs.disconnect();
      }

      if (this.redis) {
        console.log("🔌 Отключение Redis...");
        await this.redis.disconnect();
      }

      console.log("✅ Bot Service остановлен");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGQUIT", () => shutdown("SIGQUIT"));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Запуск
const bot = new BotService();
bot.start().catch((error) => {
  console.error("💥 Критическая ошибка:", error);
  process.exit(1);
});

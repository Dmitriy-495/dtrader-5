import axios from "axios";
import { createGateIOSignature } from "../signature";

/**
 * Интерфейс открытой позиции
 */
export interface UnifiedPosition {
  user_id: number;
  contract: string;
  size: number;
  leverage: string;
  risk_limit: string;
  leverage_max: string;
  maintenance_rate: string;
  value: string;
  margin: string;
  entry_price: string;
  liq_price: string;
  mark_price: string;
  unrealised_pnl: string;
  realised_pnl: string;
  history_pnl: string;
  last_close_pnl: string;
  realised_point: string;
  history_point: string;
  adl_ranking: number;
  pending_orders: number;
  close_order: {
    id: number;
    price: string;
    is_liq: boolean;
  } | null;
  mode: string;
  cross_leverage_limit: string;
  update_time: number;
  open_time: number;
}

/**
 * Конфигурация для запроса позиций
 */
export interface UnifiedPositionsConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  currency?: string; // Опционально: фильтр по валюте (USDT, BTC и т.д.)
}

/**
 * Получить открытые позиции в режиме одновалютной маржинальной торговли
 * GET /unified/positions
 *
 * @param config - Конфигурация с API ключами
 * @returns Список открытых позиций
 *
 * @see https://www.gate.io/docs/developers/apiv4/en/\#list-all-positions-of-a-user-under-unified-account
 */
export async function getUnifiedPositions(
  config: UnifiedPositionsConfig
): Promise<UnifiedPosition[]> {
  const method = "GET";
  const path = "/api/v4/unified/positions";

  // Query параметры
  const queryParams: string[] = [];
  if (config.currency) {
    queryParams.push(`currency=${config.currency}`);
  }
  const queryString = queryParams.join("&");

  const payloadString = "";

  console.log("📊 Запрос открытых позиций...");

  try {
    // Генерируем подпись
    const headers = createGateIOSignature(
      config.apiKey,
      config.apiSecret,
      method,
      path,
      queryString,
      payloadString
    );

    // Формируем URL
    const url = queryString
      ? `${config.baseUrl}/unified/positions?${queryString}`
      : `${config.baseUrl}/unified/positions`;

    console.log(url);

    // Делаем запрос
    const response = await axios.get(url, {
      headers: {
        ...headers,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const positions: UnifiedPosition[] = response.data;

    // Выводим результат
    displayPositions(positions);

    return positions;
  } catch (error: any) {
    console.error("❌ Ошибка получения позиций:");

    if (error.response) {
      console.error(`   HTTP ${error.response.status}`);
      console.error(`   ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   ${error.message}`);
    }

    throw error;
  }
}

/**
 * Красиво выводим открытые позиции
 */
function displayPositions(positions: UnifiedPosition[]): void {
  console.log("✅ Позиции получены!");
  console.log("");

  if (!positions || positions.length === 0) {
    console.log("📭 Открытых позиций нет");
    console.log("");
    return;
  }

  console.log(`📈 Открытых позиций: ${positions.length}`);
  console.log("");

  positions.forEach((position, index) => {
    const size = position.size;
    const isLong = size > 0;
    const direction = isLong ? "🟢 LONG" : "🔴 SHORT";
    const absSize = Math.abs(size);

    const unrealisedPnl = parseFloat(position.unrealised_pnl);
    const pnlColor = unrealisedPnl >= 0 ? "💚" : "❤️";
    const pnlSign = unrealisedPnl >= 0 ? "+" : "";

    console.log(
      `─── Позиция ${index + 1}: ${position.contract} ${direction} ───`
    );
    console.log(`   Размер: ${absSize} контрактов`);
    console.log(`   Плечо: ${position.leverage}x`);
    console.log(`   Цена входа: $${position.entry_price}`);
    console.log(`   Цена mark: $${position.mark_price}`);
    console.log(`   Цена ликвидации: $${position.liq_price}`);
    console.log(
      `   ${pnlColor} Unrealised PnL: ${pnlSign}${position.unrealised_pnl}`
    );
    console.log(`   Маржа: ${position.margin}`);
    console.log(`   Режим: ${position.mode}`);
    console.log(`   ADL Ranking: ${position.adl_ranking}`);

    if (position.pending_orders > 0) {
      console.log(`   ⏳ Ожидающих ордеров: ${position.pending_orders}`);
    }

    console.log("");
  });

  // Общая статистика
  const totalUnrealisedPnl = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.unrealised_pnl),
    0
  );

  const totalRealisedPnl = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.realised_pnl),
    0
  );

  console.log("📊 Общая статистика:");
  console.log(
    `   Unrealised PnL: ${
      totalUnrealisedPnl >= 0 ? "+" : ""
    }${totalUnrealisedPnl.toFixed(4)}`
  );
  console.log(
    `   Realised PnL: ${
      totalRealisedPnl >= 0 ? "+" : ""
    }${totalRealisedPnl.toFixed(4)}`
  );
  console.log("");
}

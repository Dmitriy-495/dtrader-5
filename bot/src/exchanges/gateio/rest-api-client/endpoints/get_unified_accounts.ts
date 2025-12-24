import axios from "axios";
import { createGateIOSignature } from "../signature";

/**
 * Интерфейс валюты на унифицированном счёте
 */
export interface UnifiedCurrency {
  currency: string;
  available: string;
  freeze: string;
  borrowed: string;
  interest: string;
}

/**
 * Интерфейс информации о счёте
 */
export interface UnifiedAccount {
  user_id: number;
  refresh_time: number;
  locked: boolean;
  balances: {
    [currency: string]: UnifiedCurrency;
  };
  total: string;
  borrowed: string;
  total_initial_margin: string;
  total_margin_balance: string;
  total_maintenance_margin: string;
  total_initial_margin_rate: string;
  total_maintenance_margin_rate: string;
  total_available_margin: string;
  unified_account_total: string;
  unified_account_total_liab: string;
  unified_account_total_equity: string;
  leverage: string;
  spread: string;
  enable_credit: boolean;
  position_leverage: string;
  order_leverage: string;
}

/**
 * Конфигурация для запроса
 */
export interface UnifiedAccountConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  currency?: string; // Опционально: фильтр по валюте
}

/**
 * Получить информацию об унифицированном счёте
 * GET /unified/accounts
 *
 * @param config - Конфигурация с API ключами
 * @returns Информация об унифицированном счёте
 *
 * @see https://www.gate.io/docs/developers/apiv4/en/\#query-unified-account
 */
export async function getUnifiedAccounts(
  config: UnifiedAccountConfig
): Promise<UnifiedAccount> {
  const method = "GET";
  const path = "/api/v4/unified/accounts";

  // Query параметры (если указана валюта)
  const queryParams: string[] = [];
  if (config.currency) {
    queryParams.push(`currency=${config.currency}`);
  }
  const queryString = queryParams.join("&");

  const payloadString = "";

  console.log("📊 Запрос унифицированного счёта...");

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
      ? `${config.baseUrl}/api/v4/unified/accounts?${queryString}`
      : `${config.baseUrl}/api/v4/unified/accounts`;

    // Делаем запрос
    const response = await axios.get(url, {
      headers: {
        ...headers,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const account: UnifiedAccount = response.data;

    // Выводим результат
    displayUnifiedAccount(account);

    return account;
  } catch (error: any) {
    console.error("❌ Ошибка получения унифицированного счёта:");

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
 * Красиво выводим информацию об унифицированном счёте
 */
function displayUnifiedAccount(account: UnifiedAccount): void {
  console.log("✅ Унифицированный счёт получен!");
  console.log("");

  // Основная информация
  console.log("📊 Основная информация:");
  console.log(`   User ID: ${account.user_id}`);
  console.log(`   Заблокирован: ${account.locked ? "Да ❌" : "Нет ✅"}`);
  console.log(
    `   Кредит: ${account.enable_credit ? "Включен ✅" : "Выключен"}`
  );
  console.log("");

  // Финансовые показатели
  console.log("💰 Финансовые показатели:");
  console.log(`   Общий баланс: ${account.total}`);
  console.log(`   Equity: ${account.unified_account_total_equity}`);
  console.log(`   Заёмные средства: ${account.borrowed}`);
  console.log(`   Доступная маржа: ${account.total_available_margin}`);
  console.log(`   Плечо: ${account.leverage}x`);
  console.log("");

  // Балансы по валютам
  if (account.balances && Object.keys(account.balances).length > 0) {
    console.log("💵 Балансы по валютам:");

    Object.entries(account.balances).forEach(([currency, data]) => {
      const available = parseFloat(data.available);
      const freeze = parseFloat(data.freeze);
      const borrowed = parseFloat(data.borrowed);

      // Показываем только валюты с балансом > 0
      if (available > 0 || freeze > 0 || borrowed > 0) {
        console.log(`   ${currency}:`);
        console.log(`      Доступно: ${data.available}`);
        if (freeze > 0) console.log(`      Заморожено: ${data.freeze}`);
        if (borrowed > 0) console.log(`      Заёмные: ${data.borrowed}`);
      }
    });
  }

  console.log("");
}

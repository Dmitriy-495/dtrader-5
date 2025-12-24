import axios from "axios";
import { createGateIOSignature } from "../signature";

/**
 * Интерфейс баланса по счёту
 */
export interface AccountBalance {
  currency: string;
  amount: string;
}

/**
 * Интерфейс общего баланса
 */
export interface TotalBalance {
  total: AccountBalance;
  details: {
    [accountType: string]: AccountBalance;
  };
}

/**
 * Конфигурация для запроса баланса
 */
export interface BalanceConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

/**
 * Получить общий баланс кошелька
 * GET /wallet/total_balance
 *
 * @param config - Конфигурация с API ключами
 * @returns Общий баланс по всем счетам
 *
 * @see https://www.gate.io/docs/developers/apiv4/en/\#retrieve-user-39-s-total-balances
 */
export async function getWalletTotalBalance(
  config: BalanceConfig
): Promise<TotalBalance> {
  const method = "GET";
  const path = "/api/v4/wallet/total_balance";
  const queryString = "";
  const payloadString = "";

  console.log("📊 Запрос баланса...");

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

    // Делаем запрос
    const response = await axios.get(
      `${config.baseUrl}/api/v4/wallet/total_balance`,
      {
        headers: {
          ...headers,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const balance: TotalBalance = response.data;

    // Выводим результат
    displayBalance(balance);

    return balance;
  } catch (error: any) {
    console.error("❌ Ошибка получения баланса:");

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
 * Красиво выводим баланс в консоль
 */
function displayBalance(balance: TotalBalance): void {
  console.log("✅ Баланс получен!");
  console.log("");

  // Общий баланс
  if (balance.total) {
    console.log(`💰 Общий баланс:`);
    console.log(`   ${balance.total.currency} ${balance.total.amount}`);
  }

  // Детали по счетам
  if (balance.details && Object.keys(balance.details).length > 0) {
    console.log("");
    console.log("📋 По счетам:");

    Object.entries(balance.details).forEach(([account, data]) => {
      const amount = parseFloat(data.amount);
      if (amount > 0) {
        console.log(`   ${account.padEnd(10)} ${data.currency} ${data.amount}`);
      }
    });
  }

  console.log("");
}

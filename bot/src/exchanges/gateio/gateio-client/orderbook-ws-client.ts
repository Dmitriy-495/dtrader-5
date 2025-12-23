import { BaseGateIOWebSocket } from './base-ws-client';

export interface OrderBookSnapshot {
  contract: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  timestamp: number;
}

export interface BestBidAsk {
  contract: string;
  bestBid: { price: string; size: string } | null;
  bestAsk: { price: string; size: string } | null;
  spread: number;
  spreadPercent: number;
  timestamp: number;
}

interface OrderBookConfig {
  depth?: number;
  updateSpeed?: string;
  onOrderBookUpdate?: (update: OrderBookSnapshot) => void;
  onBestBidAsk?: (data: BestBidAsk) => void;
}

export class OrderBookWebSocket extends BaseGateIOWebSocket {
  private depth: number;
  private updateSpeed: string;
  private subscribedPairs: Set<string> = new Set();
  private orderBooks: Map<string, OrderBookSnapshot> = new Map();
  private onOrderBookUpdate?: (update: OrderBookSnapshot) => void;
  private onBestBidAsk?: (data: BestBidAsk) => void;

  constructor(config: OrderBookConfig) {
    super({
      url: 'wss://fx-ws.gateio.ws/v4/ws/usdt',
      pingInterval: 15000,
      pingTimeout: 3000,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      name: 'OrderBook-WS'
    });

    this.depth = config.depth || 20;
    this.updateSpeed = config.updateSpeed || '100ms';
    this.onOrderBookUpdate = config.onOrderBookUpdate;
    this.onBestBidAsk = config.onBestBidAsk;
  }

  protected createPingMessage(): any {
    return {
      time: Math.floor(Date.now() / 1000),
      channel: 'futures.ping'
    };
  }

  protected isPongMessage(message: any): boolean {
    return message.event === 'pong' || message.channel === 'futures.pong';
  }

  protected onOpen(): void {
    if (this.subscribedPairs.size > 0) {
      console.log(`ℹ️  ${this.clientName}: Восстановление подписок на ${this.subscribedPairs.size} пар`);
      this.subscribedPairs.forEach(pair => {
        this.subscribeToPair(pair);
      });
    }
  }

  protected onMessage(message: any): void {
    if (message.channel === 'futures.order_book' && message.event === 'subscribe') {
      console.log(`✅ ${this.clientName}: Подписка подтверждена`);
      return;
    }

    if (message.event === 'update' && message.channel === 'futures.order_book') {
      this.processOrderBookUpdate(message);
      return;
    }
  }

  private processOrderBookUpdate(message: any): void {
    const contract = message.result?.contract;
    if (!contract) return;

    const snapshot: OrderBookSnapshot = {
      contract,
      bids: message.result?.bids || [],
      asks: message.result?.asks || [],
      timestamp: Date.now()
    };

    this.orderBooks.set(contract, snapshot);

    if (this.onOrderBookUpdate) {
      this.onOrderBookUpdate(snapshot);
    }

    this.calculateBestBidAsk(snapshot);
  }

  private calculateBestBidAsk(snapshot: OrderBookSnapshot): void {
    const bestBid = snapshot.bids.length > 0 ? {
      price: snapshot.bids[0][0],
      size: snapshot.bids[0][1]
    } : null;

    const bestAsk = snapshot.asks.length > 0 ? {
      price: snapshot.asks[0][0],
      size: snapshot.asks[0][1]
    } : null;

    let spread = 0;
    let spreadPercent = 0;

    if (bestBid && bestAsk) {
      const bidPrice = parseFloat(bestBid.price);
      const askPrice = parseFloat(bestAsk.price);
      spread = askPrice - bidPrice;
      spreadPercent = (spread / bidPrice) * 100;
    }

    const bestBidAsk: BestBidAsk = {
      contract: snapshot.contract,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      timestamp: Date.now()
    };

    if (this.onBestBidAsk) {
      this.onBestBidAsk(bestBidAsk);
    }
  }

  public subscribeToPair(pair: string): void {
    if (!this.isConnected()) {
      console.log(`ℹ️  ${this.clientName}: Не подключен, отложенная подписка на ${pair}`);
      this.subscribedPairs.add(pair);
      return;
    }

    const subscribeMessage = {
      time: Math.floor(Date.now() / 1000),
      channel: 'futures.order_book',
      event: 'subscribe',
      payload: [pair, this.depth.toString(), this.updateSpeed]
    };

    this.sendMessage(subscribeMessage);
    this.subscribedPairs.add(pair);
    console.log(`ℹ️  ${this.clientName}: Подписка на ${pair}`);
  }

  public unsubscribeFromPair(pair: string): void {
    if (!this.isConnected()) {
      this.subscribedPairs.delete(pair);
      this.orderBooks.delete(pair);
      return;
    }

    const unsubscribeMessage = {
      time: Math.floor(Date.now() / 1000),
      channel: 'futures.order_book',
      event: 'unsubscribe',
      payload: [pair]
    };

    this.sendMessage(unsubscribeMessage);
    this.subscribedPairs.delete(pair);
    this.orderBooks.delete(pair);
    console.log(`ℹ️  ${this.clientName}: Отписка от ${pair}`);
  }

  public getOrderBook(pair: string): OrderBookSnapshot | null {
    return this.orderBooks.get(pair) || null;
  }

  public getBestBidAsk(pair: string): BestBidAsk | null {
    const snapshot = this.orderBooks.get(pair);
    if (!snapshot) return null;

    const bestBid = snapshot.bids.length > 0 ? {
      price: snapshot.bids[0][0],
      size: snapshot.bids[0][1]
    } : null;

    const bestAsk = snapshot.asks.length > 0 ? {
      price: snapshot.asks[0][0],
      size: snapshot.asks[0][1]
    } : null;

    let spread = 0;
    let spreadPercent = 0;

    if (bestBid && bestAsk) {
      const bidPrice = parseFloat(bestBid.price);
      const askPrice = parseFloat(bestAsk.price);
      spread = askPrice - bidPrice;
      spreadPercent = (spread / bidPrice) * 100;
    }

    return {
      contract: pair,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      timestamp: Date.now()
    };
  }

  public getSubscribedPairs(): string[] {
    return Array.from(this.subscribedPairs);
  }
}

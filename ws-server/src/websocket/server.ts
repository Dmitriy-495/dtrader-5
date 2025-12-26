import WebSocket, { WebSocketServer } from 'ws';

export interface WsServerConfig {
  port: number;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private config: WsServerConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(config: WsServerConfig) {
    this.config = config;
  }

  start(): void {
    this.wss = new WebSocketServer({ port: this.config.port });
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
    this.wss.on('error', () => {});
  }

  stop(): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    this.send(ws, {
      type: 'welcome',
      message: 'Connected to DTrader-5.1 WS Server',
      timestamp: Date.now(),
    });

    ws.on('message', () => {});
    ws.on('close', () => {
      this.clients.delete(ws);
    });
    ws.on('error', () => {
      this.clients.delete(ws);
    });
  }

  private send(client: WebSocket, data: any): void {
    if (client.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      client.send(message);
    }
  }

  broadcast(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export default WsServer;

require('dotenv').config();
const WebSocket = require('ws');
const { EventLogger } = require('./events/logger');
const { EventType } = require('./events/types');

// ============================================
// DTrader-5.1 WebSocket Test Client
// Pretty Console Output + JSON Events
// ============================================

const config = {
  wsUrl: process.env.WS_SERVER_URL || 'ws://localhost:2808',
  clientName: process.env.CLIENT_NAME || 'DTrader-TUI-Client',
};

class WsClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.heartbeatCount = 0;
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
    this.eventLogger = new EventLogger();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Форматировать время в 24-часовом формате
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Красивый вывод в консоль
   */
  prettyLog(emoji, time, message, color = '') {
    const colorCodes = {
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      reset: '\x1b[0m',
    };

    const colorCode = colorCodes[color] || '';
    const reset = colorCodes.reset;

    console.log(`${colorCode}${emoji} [${time}] ${message}${reset}`);
  }

  connect() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       📡 DTrader-5.1 WebSocket Test Client 📡                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Client: ${config.clientName}`);
    console.log(`  Server: ${config.wsUrl}`);
    console.log(`  Session: ${this.sessionId}`);
    console.log('');
    console.log('─'.repeat(64));
    console.log('');

    this.ws = new WebSocket(config.wsUrl);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('close', (code, reason) => this.handleClose(code, reason));
  }

  handleOpen() {
    this.isConnected = true;
    const time = this.formatTime(Date.now());
    
    this.prettyLog('✅', time, 'Connected to WS-Server', 'green');
    console.log('');

    // Логируем событие в JSON
    const event = {
      event: EventType.WS_CONNECTED,
      source: 'ws-client',
      level: 'info',
      timestamp: Date.now(),
      data: {
        server: config.wsUrl,
        client_name: config.clientName,
      },
      metadata: {
        session_id: this.sessionId,
      },
    };

    this.eventLogger.log(event);
  }

  handleMessage(data) {
    try {
      const event = JSON.parse(data.toString());

      // Обрабатываем разные типы событий
      if (event.type === 'welcome') {
        this.handleWelcome(event);
      } else if (event.event === EventType.HEARTBEAT_PONG) {
        this.handleHeartbeat(event);
      } else {
        this.handleGenericEvent(event);
      }
    } catch (error) {
      const time = this.formatTime(Date.now());
      this.prettyLog('❌', time, `Parse error: ${error.message}`, 'red');

      const errorEvent = {
        event: EventType.SYSTEM_ERROR,
        source: 'ws-client',
        level: 'error',
        timestamp: Date.now(),
        data: {
          error: error.message,
          context: 'Message parsing',
        },
        metadata: {
          session_id: this.sessionId,
        },
      };
      this.eventLogger.error(errorEvent);
    }
  }

  handleWelcome(message) {
    const time = this.formatTime(Date.now());
    this.prettyLog('👋', time, `Welcome: ${message.message}`, 'cyan');

    const event = {
      event: 'WELCOME_RECEIVED',
      source: 'ws-client',
      level: 'info',
      timestamp: Date.now(),
      data: message,
      metadata: {
        session_id: this.sessionId,
      },
    };
    this.eventLogger.log(event);
  }

  handleHeartbeat(event) {
    this.heartbeatCount++;
    const time = this.formatTime(Date.now());
    const latency = event.metadata?.latency || 0;
    const exchange = event.metadata?.exchange || 'unknown';
    
    // Определяем цвет по latency
    let color = 'green';
    let status = 'OK';
    if (latency > 500) {
      color = 'red';
      status = 'SLOW';
    } else if (latency > 200) {
      color = 'yellow';
      status = 'WARN';
    }

    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Красивая однострочная запись
    this.prettyLog(
      '🏓', 
      time, 
      `PONG #${this.heartbeatCount} | ${exchange} | ${latency}ms | ${status} | uptime: ${uptimeSec}s`, 
      color
    );

    // JSON событие
    const clientEvent = {
      event: 'HEARTBEAT_RECEIVED',
      source: 'ws-client',
      level: 'info',
      timestamp: Date.now(),
      data: {
        count: this.heartbeatCount,
        uptime_sec: uptimeSec,
        original_event: event,
      },
      metadata: {
        session_id: this.sessionId,
        latency,
        exchange,
        status,
      },
    };

    this.eventLogger.log(clientEvent);
  }

  handleGenericEvent(event) {
    const time = this.formatTime(Date.now());
    this.prettyLog('📨', time, `Event: ${event.event} from ${event.source}`, 'gray');

    const clientEvent = {
      event: 'EVENT_RECEIVED',
      source: 'ws-client',
      level: 'info',
      timestamp: Date.now(),
      data: event,
      metadata: {
        session_id: this.sessionId,
      },
    };
    this.eventLogger.log(clientEvent);
  }

  handleError(error) {
    const time = this.formatTime(Date.now());
    this.prettyLog('❌', time, `Error: ${error.message}`, 'red');

    const event = {
      event: EventType.WS_ERROR,
      source: 'ws-client',
      level: 'error',
      timestamp: Date.now(),
      data: {
        error: error.message,
      },
      metadata: {
        session_id: this.sessionId,
      },
    };
    this.eventLogger.error(event);
  }

  handleClose(code, reason) {
    this.isConnected = false;
    const time = this.formatTime(Date.now());
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    console.log('');
    this.prettyLog('🔌', time, `Disconnected | Code: ${code} | Reason: ${reason || 'N/A'}`, 'yellow');
    console.log('');
    console.log('─'.repeat(64));
    console.log(`  📊 Statistics:`);
    console.log(`     Heartbeats received: ${this.heartbeatCount}`);
    console.log(`     Uptime: ${uptimeSec}s`);
    if (this.heartbeatCount > 0) {
      console.log(`     Avg interval: ${Math.floor(uptimeSec / this.heartbeatCount)}s`);
    }
    console.log('─'.repeat(64));

    const event = {
      event: EventType.WS_DISCONNECTED,
      source: 'ws-client',
      level: 'warn',
      timestamp: Date.now(),
      data: {
        code,
        reason: reason.toString() || 'No reason',
        heartbeat_count: this.heartbeatCount,
        uptime_sec: uptimeSec,
      },
      metadata: {
        session_id: this.sessionId,
      },
    };

    this.eventLogger.log(event);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
}

// ============================================
// Точка входа
// ============================================

const client = new WsClient();

process.on('SIGINT', () => {
  console.log('');
  client.disconnect();
  setTimeout(() => process.exit(0), 500);
});

process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    event: 'SYSTEM_ERROR',
    source: 'ws-client',
    level: 'error',
    timestamp: Date.now(),
    data: { error: error.message },
  }));
  client.disconnect();
  process.exit(1);
});

client.connect();

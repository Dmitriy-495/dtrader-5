require('dotenv').config();
const WebSocket = require('ws');

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
    
    this.accountState = null;
    this.balanceState = null;
    this.positionsState = null;
    this.lastStateUpdate = null;
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  prettyLog(emoji, time, message, color = '') {
    const colorCodes = {
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      magenta: '\x1b[35m',
      reset: '\x1b[0m',
    };

    const colorCode = colorCodes[color] || '';
    const reset = colorCodes.reset;

    console.log(`${colorCode}${emoji} [${time}] ${message}${reset}`);
  }

  printHeader() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       📡 DTrader-5.1 WebSocket Test Client 📡                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  printState() {
    console.log('');
    console.log('─'.repeat(64));
    console.log('📊 ACCOUNT STATE:');
    
    if (this.accountState) {
      console.log(`   User ID: ${this.accountState.user_id}`);
      console.log(`   Equity: ${this.accountState.equity} ${this.accountState.currency}`);
      console.log(`   Leverage: ${this.accountState.leverage}x`);
    }

    if (this.balanceState) {
      console.log(`   Balance: ${this.balanceState.balance} ${this.balanceState.currency}`);
    }

    if (this.positionsState) {
      const count = this.positionsState.count || 0;
      console.log(`   Open Positions: ${count}`);
      
      if (count > 0 && this.positionsState.positions) {
        this.positionsState.positions.forEach(pos => {
          const side = pos.side.toUpperCase();
          console.log(`      ${pos.contract} ${side} ${Math.abs(pos.size)} | PnL: ${pos.unrealised_pnl}`);
        });
      }
    }

    if (this.lastStateUpdate) {
      const age = Math.floor((Date.now() - this.lastStateUpdate) / 1000);
      console.log(`   Last Update: ${age}s ago`);
    }

    console.log('─'.repeat(64));
    console.log('');
  }

  connect() {
    this.printHeader();
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
  }

  handleMessage(data) {
    try {
      const event = JSON.parse(data.toString());

      if (event.type === 'welcome') {
        this.handleWelcome(event);
      } else if (event.event === 'INITIAL_STATE') {
        this.handleInitialState(event);
      } else if (event.event === 'HEARTBEAT_PONG') {
        this.handleHeartbeat(event);
      } else if (event.event === 'STATE_UPDATED') {
        this.handleStateUpdate(event);
      }
    } catch (error) {
      const time = this.formatTime(Date.now());
      this.prettyLog('❌', time, `Parse error: ${error.message}`, 'red');
    }
  }

  handleWelcome(message) {
    const time = this.formatTime(Date.now());
    this.prettyLog('👋', time, `${message.message}`, 'cyan');
  }

  handleInitialState(event) {
    const time = this.formatTime(Date.now());
    
    if (event.data) {
      if (event.data.account) {
        this.accountState = event.data.account;
      }
      if (event.data.balance) {
        this.balanceState = event.data.balance;
      }
      if (event.data.positions) {
        this.positionsState = event.data.positions;
      }
      this.lastStateUpdate = Date.now();
    }

    this.prettyLog('📊', time, 'Initial state received from Redis', 'magenta');
    this.printState();
  }

  handleHeartbeat(event) {
    this.heartbeatCount++;
    const time = this.formatTime(Date.now());
    const latency = event.metadata?.latency || 0;
    const exchange = event.metadata?.exchange || 'unknown';
    
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
    
    this.prettyLog(
      '🏓', 
      time, 
      `PONG #${this.heartbeatCount} | ${exchange} | ${latency}ms | ${status} | uptime: ${uptimeSec}s`, 
      color
    );
  }

  handleStateUpdate(event) {
    const time = this.formatTime(Date.now());
    
    if (event.data) {
      // Обновляем только изменённые данные
      this.lastStateUpdate = Date.now();
    }

    this.prettyLog('📊', time, `State updated`, 'magenta');
  }

  handleError(error) {
    const time = this.formatTime(Date.now());
    this.prettyLog('❌', time, `Error: ${error.message}`, 'red');
  }

  handleClose(code, reason) {
    this.isConnected = false;
    const time = this.formatTime(Date.now());
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    console.log('');
    this.prettyLog('🔌', time, `Disconnected | Code: ${code}`, 'yellow');
    console.log('');
    console.log('─'.repeat(64));
    console.log(`  📊 Statistics:`);
    console.log(`     Heartbeats: ${this.heartbeatCount}`);
    console.log(`     Uptime: ${uptimeSec}s`);
    if (this.heartbeatCount > 0) {
      console.log(`     Avg interval: ${Math.floor(uptimeSec / this.heartbeatCount)}s`);
    }
    console.log('─'.repeat(64));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
}

const client = new WsClient();

process.on('SIGINT', () => {
  console.log('');
  client.disconnect();
  setTimeout(() => process.exit(0), 500);
});

process.on('uncaughtException', (error) => {
  console.error(`❌ Error: ${error.message}`);
  client.disconnect();
  process.exit(1);
});

client.connect();

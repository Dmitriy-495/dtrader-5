import * as dotenv from 'dotenv';
import { RedisStateManager } from './redis/state-manager';

dotenv.config();

async function testStateStore() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     🧪 Test Redis State Store 🧪         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  const stateManager = new RedisStateManager({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
    await stateManager.connect();
    console.log('✅ Connected to Redis');
    console.log('');

    const userId = 16843264;

    // Проверяем сохранённое состояние
    console.log('📊 Full State:');
    const fullState = await stateManager.getFullState(userId);
    console.log(JSON.stringify(fullState, null, 2));
    console.log('');

    console.log('✅ Test complete!');
    await stateManager.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await stateManager.disconnect();
    process.exit(1);
  }
}

testStateStore();

import * as dotenv from "dotenv";
import { RedisPublisher } from "./redis/publisher";

dotenv.config();

async function testRedisPublish() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🔴 Тест Redis Publisher 🔴             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  const publisher = new RedisPublisher({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
    await publisher.connect();

    console.log('');
    console.log('📤 Отправляем тестовые сообщения...');
    
    // Отправляем 3 сообщения с интервалом 2 секунды
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- Сообщение ${i} ---`);
      await publisher.publish('system:heartbeat:bot', {
        test: true,
        message: `Test message ${i}`,
        timestamp: Date.now(),
      });
      
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('');
    console.log('✅ Тест завершён!');
    
    await publisher.disconnect();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await publisher.disconnect();
    process.exit(1);
  }
}

testRedisPublish();

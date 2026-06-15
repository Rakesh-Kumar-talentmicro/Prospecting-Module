import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
  retryStrategy: (attempt) => Math.min(attempt * 200, 2000)
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

// BullMQ connection — must NOT have commandTimeout or maxRetriesPerRequest cap
// because BullMQ uses blocking Redis commands (BRPOPLPUSH etc.)
export const importRedis = new IORedis({
  ...redisOptions,
  commandTimeout: undefined,
  maxRetriesPerRequest: null
});

// Progress tracking connection — lightweight, used for HSET/HGETALL per import job
export const importProgressRedis = new IORedis({
  ...redisOptions,
  commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT_MS || 5000),
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true
});

importRedis.on('error', (err) => {
  console.error('Import Redis error:', err.message);
});

importProgressRedis.on('error', (err) => {
  console.error('Import progress Redis error:', err.message);
});

export default importRedis;

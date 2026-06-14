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

export const importRedis = new IORedis({
  ...redisOptions,
  // BullMQ uses blocking Redis commands; command timeout causes false worker errors.
  commandTimeout: undefined,
  maxRetriesPerRequest: null
});

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

import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const RedisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

RedisClient.on('error', err => console.log('Redis Client Error', err));

// await RedisClient.connect(); --> uncomment it when you have your redis credientials.
export default RedisClient;


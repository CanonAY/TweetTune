import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

export class RedisConnection {
  private static instance: RedisConnection;
  public client: Redis;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('ready', () => {
      console.log('Redis is ready to accept commands');
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    console.log('Redis connection closed');
  }

  public async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }
}

export const redisConnection = RedisConnection.getInstance();
export const redisClient = redisConnection.client;

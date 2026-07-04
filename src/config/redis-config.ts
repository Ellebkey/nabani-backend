import { logger } from '@config/logger';
import { createClient } from 'redis';

export const redisClient = createClient({ RESP: 3 });

export class RedisDB {
  initRedis = async () => {
    redisClient.on('error', (err) => logger.error('Redis client Error', err));
    redisClient.on('connect', () => logger.info('Redis Databases synchronized'));
    await redisClient.connect();
  };
}

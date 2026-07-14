import { redisClient } from '@config/redis-config';
import { initTestDatabase, closeTestDatabase } from './helpers/db.helper';

// Mock only the logger to suppress noise during tests
jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    http: jest.fn(),
    log: jest.fn(),
  },
}));

beforeAll(async () => {
  await initTestDatabase();
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}, 30000);

afterAll(async () => {
  if (redisClient.isOpen) {
    await redisClient.close();
  }
  await closeTestDatabase();
});

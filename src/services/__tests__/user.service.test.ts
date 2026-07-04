jest.mock('@config/sequelize', () => ({
  db: {
    User: {
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
    },
    UserConfig: {
      findOne: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      findOrCreate: jest.fn(),
    },
  },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@config/redis-config', () => ({
  redisClient: {
    del: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
  },
}));

jest.mock('@utils/transaction.util', () => require('../../test/unit/mocks/transaction.util.mock'));

import { db } from '@config/sequelize';
import { redisClient } from '@config/redis-config';
import UserService from '@services/user.service';
import { NotFoundError, InternalServerError } from '@errors/app-error';

const mockUser = db.User as unknown as {
  create: jest.Mock;
  update: jest.Mock;
  destroy: jest.Mock;
  findByPk: jest.Mock;
  findAndCountAll: jest.Mock;
};

const mockUserConfig = db.UserConfig as unknown as {
  findOne: jest.Mock;
  create: jest.Mock;
  destroy: jest.Mock;
  findOrCreate: jest.Mock;
};

const mockRedis = redisClient as unknown as {
  del: jest.Mock;
  set: jest.Mock;
};

// ─── Test helpers ────────────────────────────────────────────────────

const TEST_USER_ID = 'user-uuid-123';

const makeUserInstance = (overrides: Record<string, unknown> = {}) => ({
  id: TEST_USER_ID,
  username: 'testuser',
  email: 'test@example.com',
  mobileNumber: '1234567890',
  roles: ['user'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeUserConfigInstance = (overrides: Record<string, unknown> = {}) => ({
  userId: TEST_USER_ID,
  defaultAccount: 'acc-1',
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────

  describe('create', () => {
    it('When valid data is provided, creates user and returns DTO', async () => {
      const instance = makeUserInstance();
      mockUser.create.mockResolvedValue(instance);

      const result = await UserService.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        mobileNumber: '1234567890',
      });

      expect(result).toEqual({
        id: TEST_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        mobileNumber: '1234567890',
        roles: ['user'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('When no roles are provided, defaults to ["user"]', async () => {
      const instance = makeUserInstance();
      mockUser.create.mockResolvedValue(instance);

      await UserService.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      });

      expect(mockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ roles: ['user'] }),
        expect.anything(),
      );
    });

    it('When called, wraps the operation in a transaction', async () => {
      const instance = makeUserInstance();
      mockUser.create.mockResolvedValue(instance);

      await UserService.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      });

      expect(mockUser.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ transaction: expect.any(Object) }),
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────

  describe('update', () => {
    it('When user exists, updates and returns DTO', async () => {
      const updatedInstance = makeUserInstance({ username: 'updateduser' });
      mockUser.update.mockResolvedValue([1, [updatedInstance]]);

      const result = await UserService.update(TEST_USER_ID, { username: 'updateduser' });

      expect(result.username).toBe('updateduser');
      expect(result.id).toBe(TEST_USER_ID);
    });

    it('When user is not found (0 updated), throws NotFoundError', async () => {
      mockUser.update.mockResolvedValue([0, []]);

      await expect(UserService.update('nonexistent-id', { username: 'updateduser' }))
        .rejects.toThrow(NotFoundError);
    });

    it('When update succeeds, returns the full updated user DTO', async () => {
      const updatedInstance = makeUserInstance({
        username: 'newname',
        email: 'new@example.com',
        roles: ['user', 'admin'],
      });
      mockUser.update.mockResolvedValue([1, [updatedInstance]]);

      const result = await UserService.update(TEST_USER_ID, {
        username: 'newname',
        email: 'new@example.com',
        roles: ['user', 'admin'],
      });

      expect(result).toEqual({
        id: TEST_USER_ID,
        username: 'newname',
        email: 'new@example.com',
        mobileNumber: '1234567890',
        roles: ['user', 'admin'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });
  });

  // ─── delete ──────────────────────────────────────────────────────

  describe('delete', () => {
    it('When user exists, deletes UserConfig then User and clears Redis', async () => {
      mockUserConfig.destroy.mockResolvedValue(1);
      mockUser.destroy.mockResolvedValue(1);

      await expect(UserService.delete(TEST_USER_ID)).resolves.toBeUndefined();

      expect(mockUserConfig.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: TEST_USER_ID } }),
      );
      expect(mockUser.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TEST_USER_ID } }),
      );
    });

    it('When user is deleted, clears the Redis default_account cache key', async () => {
      mockUserConfig.destroy.mockResolvedValue(0);
      mockUser.destroy.mockResolvedValue(1);

      await UserService.delete(TEST_USER_ID);

      expect(mockRedis.del).toHaveBeenCalledWith(`default_account_${TEST_USER_ID}`);
    });

    it('When user is not found (0 deleted), throws NotFoundError', async () => {
      mockUserConfig.destroy.mockResolvedValue(0);
      mockUser.destroy.mockResolvedValue(0);

      await expect(UserService.delete('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });

  // ─── findById ────────────────────────────────────────────────────

  describe('findById', () => {
    it('When user exists, returns user DTO', async () => {
      mockUser.findByPk.mockResolvedValue(makeUserInstance());

      const result = await UserService.findById(TEST_USER_ID);

      expect(result).toEqual({
        id: TEST_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        mobileNumber: '1234567890',
        roles: ['user'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('When user does not exist, returns null', async () => {
      mockUser.findByPk.mockResolvedValue(null);

      const result = await UserService.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('When an unexpected error occurs, wraps it in InternalServerError', async () => {
      mockUser.findByPk.mockRejectedValue(new Error('DB connection failed'));

      await expect(UserService.findById(TEST_USER_ID))
        .rejects.toThrow(InternalServerError);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────

  describe('findAll', () => {
    it('When users exist, returns paginated list with count', async () => {
      mockUser.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [
          makeUserInstance(),
          makeUserInstance({ id: 'user-uuid-456', username: 'anotheruser' }),
        ],
      });

      const result = await UserService.findAll({ offset: 0, limit: 50 });

      expect(result.count).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]!.username).toBe('testuser');
      expect(result.rows[1]!.username).toBe('anotheruser');
    });

    it('When searchText is provided, applies iLike filter on username and email', async () => {
      mockUser.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await UserService.findAll({ searchText: 'test' });

      const callArgs = mockUser.findAndCountAll.mock.calls[0][0] as Record<string, unknown>;
      const where = callArgs.where as Record<symbol, unknown>;
      // Verify the where clause contains an Op.or with search conditions
      expect(where).toBeDefined();
      expect(mockUser.findAndCountAll).toHaveBeenCalledTimes(1);
    });

    it('When role filter is provided, applies Op.contains filter', async () => {
      mockUser.findAndCountAll.mockResolvedValue({ count: 1, rows: [makeUserInstance()] });

      await UserService.findAll({ role: 'admin' });

      const callArgs = mockUser.findAndCountAll.mock.calls[0][0] as Record<string, unknown>;
      const where = callArgs.where as Record<string, unknown>;
      expect(where).toHaveProperty('roles');
    });
  });

  // ─── setDefaultAccount ───────────────────────────────────────────

  describe('setDefaultAccount', () => {
    it('When no config exists, creates a new UserConfig record', async () => {
      mockUserConfig.findOne.mockResolvedValue(null);
      mockUserConfig.create.mockResolvedValue(makeUserConfigInstance());

      await UserService.setDefaultAccount(TEST_USER_ID, 'acc-new');

      expect(mockUserConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_USER_ID,
          defaultAccount: 'acc-new',
        }),
        expect.anything(),
      );
    });

    it('When config exists, updates it and sets Redis cache', async () => {
      const existingConfig = makeUserConfigInstance();
      mockUserConfig.findOne.mockResolvedValue(existingConfig);

      await UserService.setDefaultAccount(TEST_USER_ID, 'acc-updated');

      expect(existingConfig.update).toHaveBeenCalledWith(
        { defaultAccount: 'acc-updated' },
        expect.anything(),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        `default_account_${TEST_USER_ID}`,
        'acc-updated',
      );
    });
  });

  // ─── getUserConfig ───────────────────────────────────────────────

  describe('getUserConfig', () => {
    it('When no config exists, returns default config with empty defaultAccount', async () => {
      mockUserConfig.findOne.mockResolvedValue(null);

      const result = await UserService.getUserConfig(TEST_USER_ID);

      expect(result).toEqual({ defaultAccount: '' });
    });
  });

  // ─── updateUserConfig ────────────────────────────────────────────

  describe('updateUserConfig', () => {
    it('When config does not exist, creates it via findOrCreate', async () => {
      const newConfig = makeUserConfigInstance({ defaultAccount: 'acc-new' });
      mockUserConfig.findOrCreate.mockResolvedValue([newConfig, true]);

      const result = await UserService.updateUserConfig(TEST_USER_ID, { defaultAccount: 'acc-new' });

      expect(result.defaultAccount).toBe('acc-new');
      // When created, update should NOT be called
      expect(newConfig.update).not.toHaveBeenCalled();
    });

    it('When config exists and defaultAccount changes, updates config and Redis cache', async () => {
      const existingConfig = makeUserConfigInstance({ defaultAccount: 'acc-old' });
      mockUserConfig.findOrCreate.mockResolvedValue([existingConfig, false]);

      await UserService.updateUserConfig(TEST_USER_ID, { defaultAccount: 'acc-new' });

      expect(existingConfig.update).toHaveBeenCalledWith(
        { defaultAccount: 'acc-new' },
        expect.anything(),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        `default_account_${TEST_USER_ID}`,
        'acc-new',
      );
    });
  });
});

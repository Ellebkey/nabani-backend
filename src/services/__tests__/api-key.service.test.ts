const mockApiKey = {
  create: jest.fn(), findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(),
};
const mockUser = { findByPk: jest.fn() };

jest.mock('@config/sequelize', () => ({ db: { ApiKey: mockApiKey, User: mockUser } }));
jest.mock('@config/logger', () => require('../../test/unit/mocks/logger.mock'));
jest.mock('@utils/transaction.util', () => require('../../test/unit/mocks/transaction.util.mock'));

import crypto from 'crypto';
import ApiKeyService from '@services/api-key.service';
import { UnauthorizedError, NotFoundError } from '@errors/app-error';

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ApiKeyService.generate', () => {
  it('mints a prefixed key, stores ONLY its sha256 hash, and returns the plaintext once', async () => {
    mockUser.findByPk.mockResolvedValue({ id: 'user-1', username: 'a@b.com', roles: ['free'] });
    mockApiKey.create.mockImplementation((data: Record<string, unknown>) => Promise.resolve({
      id: 1,
      ...data,
      createdAt: new Date('2026-06-30T00:00:00Z'),
      lastUsedAt: null,
      revokedAt: null,
    }));

    const result = await ApiKeyService.generate({ userId: 'user-1', name: 'n8n', scopes: ['drafts:write'] });

    expect(result.key.startsWith('mgk_live_')).toBe(true);
    expect(result.keyPrefix.startsWith('mgk_live_')).toBe(true);

    const stored = mockApiKey.create.mock.calls[0][0];
    // Never persist the plaintext; persist its hash.
    expect(stored.keyHash).toBe(sha256(result.key));
    expect(JSON.stringify(stored)).not.toContain(result.key);
    expect(stored.userId).toBe('user-1');
    expect(stored.scopes).toEqual(['drafts:write']);
  });

  it('throws NotFoundError when the target user does not exist', async () => {
    mockUser.findByPk.mockResolvedValue(null);

    await expect(
      ApiKeyService.generate({ userId: 'ghost', name: 'x', scopes: ['drafts:write'] }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockApiKey.create).not.toHaveBeenCalled();
  });
});

describe('ApiKeyService.authenticate', () => {
  const KEY = 'mgk_live_abcdefghijklmnopqrstuvwxyz0123456789';

  function makeStoredKey(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 5,
      userId: 'user-1',
      keyHash: sha256(KEY),
      scopes: ['drafts:write'],
      revokedAt: null,
      expiresAt: null,
      lastUsedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('resolves a valid key to its user and records last_used_at', async () => {
    const stored = makeStoredKey();
    mockApiKey.findOne.mockResolvedValue(stored);
    mockUser.findByPk.mockResolvedValue({ id: 'user-1', username: 'a@b.com', roles: ['free'] });

    const result = await ApiKeyService.authenticate(KEY);

    expect(mockApiKey.findOne).toHaveBeenCalledWith({ where: { keyHash: sha256(KEY) } });
    expect(result.user).toEqual({ id: 'user-1', username: 'a@b.com', roles: ['free'] });
    expect(result.apiKey.id).toBe(5);
    expect(stored.lastUsedAt).toBeInstanceOf(Date);
    expect(stored.save).toHaveBeenCalled();
  });

  it('rejects a key without the expected prefix without touching the DB', async () => {
    await expect(ApiKeyService.authenticate('not-a-maguey-key')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mockApiKey.findOne).not.toHaveBeenCalled();
  });

  it('rejects an unknown key', async () => {
    mockApiKey.findOne.mockResolvedValue(null);
    await expect(ApiKeyService.authenticate(KEY)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects when the stored hash does not match (constant-time guard)', async () => {
    mockApiKey.findOne.mockResolvedValue(makeStoredKey({ keyHash: sha256('some-other-key') }));
    await expect(ApiKeyService.authenticate(KEY)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a revoked key', async () => {
    mockApiKey.findOne.mockResolvedValue(makeStoredKey({ revokedAt: new Date('2026-06-01T00:00:00Z') }));
    await expect(ApiKeyService.authenticate(KEY)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an expired key', async () => {
    mockApiKey.findOne.mockResolvedValue(makeStoredKey({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(ApiKeyService.authenticate(KEY)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects when the owning user no longer exists', async () => {
    mockApiKey.findOne.mockResolvedValue(makeStoredKey());
    mockUser.findByPk.mockResolvedValue(null);
    await expect(ApiKeyService.authenticate(KEY)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

import crypto from 'crypto';

import { db } from '@config/sequelize';
import { logger } from '@config/logger';

import withTransaction from '@utils/transaction.util';
import errorToString from '@utils/error.util';

import { ApiKeyInstance } from '@models/api-key.model';

import { UnauthorizedError, NotFoundError, BusinessRuleError } from '@errors/app-error';

import { JWTPayload } from '@interfaces/user.dto';
import {
  ApiKeyDto,
  ApiKeyScope,
  CreateApiKeyDto,
  GeneratedApiKeyDto,
} from '@interfaces/api-key.dto';

// Human-identifiable, environment-tagged prefix (e.g. mgk_live_xxxxxxxx...).
const KEY_PREFIX = 'mgk_live_';
// 32 random bytes = 256 bits of entropy — far beyond brute-force reach.
const RANDOM_BYTES = 32;
// How much of the random part is echoed into the stored, listable key_prefix.
const PREFIX_VISIBLE_CHARS = 8;

export interface AuthenticatedApiKey {
  apiKey: ApiKeyInstance;
  user: JWTPayload;
}

/**
 * API Key Service
 * Generates, authenticates, revokes and rotates API keys. Only the SHA-256 hash
 * of a key is ever stored; the plaintext is returned once at creation. Keys are
 * resolved by hash and verified with a constant-time comparison.
 */
class ApiKeyService {
  /**
   * Mint a new key for a user. Returns the plaintext `key` exactly once — the
   * caller must surface it to the operator; it can never be recovered later.
   */
  async generate(dto: CreateApiKeyDto): Promise<GeneratedApiKeyDto> {
    const user = await db.User.findByPk(dto.userId);
    if (!user) throw new NotFoundError('User', dto.userId);

    const random = crypto.randomBytes(RANDOM_BYTES).toString('base64url');
    const key = `${KEY_PREFIX}${random}`;
    const keyPrefix = `${KEY_PREFIX}${random.slice(0, PREFIX_VISIBLE_CHARS)}`;
    const keyHash = this.hashKey(key);

    const created = await withTransaction(async (transaction) => db.ApiKey.create({
      userId: dto.userId,
      name: dto.name,
      keyPrefix,
      keyHash,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ?? null,
    }, { transaction }));

    logger.info('API key generated', { apiKeyId: created.id, userId: dto.userId, scopes: dto.scopes });

    return { ...this.toDto(created), key };
  }

  /**
   * Resolve and validate a raw key from the `X-API-Key` header. Throws
   * `UnauthorizedError` for any invalid/revoked/expired/unknown key. On success
   * records `last_used_at` and returns the key plus a JWT-shaped `req.user`.
   */
  async authenticate(rawKey: string): Promise<AuthenticatedApiKey> {
    if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
      throw new UnauthorizedError('Invalid API key');
    }

    const keyHash = this.hashKey(rawKey);
    const apiKey = await db.ApiKey.findOne({ where: { keyHash } });

    // Constant-time compare as defense-in-depth even though the lookup is exact.
    if (!apiKey || !this.safeEqual(apiKey.keyHash, keyHash)) {
      throw new UnauthorizedError('Invalid API key');
    }
    if (apiKey.revokedAt) {
      throw new UnauthorizedError('API key has been revoked');
    }
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('API key has expired');
    }

    const user = await db.User.findByPk(apiKey.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid API key');
    }

    // Best-effort usage stamp — never fail an otherwise-valid request if it fails.
    try {
      apiKey.lastUsedAt = new Date();
      await apiKey.save({ fields: ['lastUsedAt', 'updatedAt'] });
    } catch (error: unknown) {
      logger.warn('Failed to update API key last_used_at', { apiKeyId: apiKey.id, error: errorToString(error) });
    }

    return {
      apiKey,
      user: { id: user.id, username: user.username, roles: user.roles ?? [] },
    };
  }

  async list(userId: string): Promise<ApiKeyDto[]> {
    const keys = await db.ApiKey.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    return keys.map((key) => this.toDto(key));
  }

  /**
   * Revoke a key so it can no longer authenticate. Optionally scoped to a user
   * so a caller cannot revoke a key that isn't theirs.
   */
  async revoke(id: number, userId?: string): Promise<ApiKeyDto> {
    return withTransaction(async (transaction) => {
      const where = userId ? { id, userId } : { id };
      const apiKey = await db.ApiKey.findOne({ where, transaction });
      if (!apiKey) throw new NotFoundError('ApiKey', id);
      if (apiKey.revokedAt) throw new BusinessRuleError('API key is already revoked');

      apiKey.revokedAt = new Date();
      await apiKey.save({ transaction });

      logger.info('API key revoked', { apiKeyId: id });
      return this.toDto(apiKey);
    });
  }

  /**
   * Rotate a key: revoke the old one and mint a fresh key inheriting the same
   * user, label, scopes and expiry. Returns the new plaintext key (once).
   */
  async rotate(id: number): Promise<GeneratedApiKeyDto> {
    const existing = await db.ApiKey.findByPk(id);
    if (!existing) throw new NotFoundError('ApiKey', id);

    if (!existing.revokedAt) {
      await this.revoke(id);
    }

    return this.generate({
      userId: existing.userId,
      name: existing.name,
      scopes: (existing.scopes ?? []) as ApiKeyScope[],
      expiresAt: existing.expiresAt,
    });
  }

  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private toDto(apiKey: ApiKeyInstance): ApiKeyDto {
    return {
      id: apiKey.id,
      userId: apiKey.userId,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes ?? [],
      lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
      expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
      revokedAt: apiKey.revokedAt ? apiKey.revokedAt.toISOString() : null,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }
}

export default new ApiKeyService();

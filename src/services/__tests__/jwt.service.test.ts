jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), log: jest.fn() },
}));

jest.mock('@config/config', () => ({
  __esModule: true,
  default: { jwtSecret: 'test-secret-key-for-testing-only' },
}));

const mockRedisClient = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  sAdd: jest.fn().mockResolvedValue(1),
  sRem: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(true),
  multi: jest.fn(),
};

jest.mock('@config/redis-config', () => ({
  redisClient: mockRedisClient,
}));

import jwt from 'jsonwebtoken';
import JWTService from '@services/jwt.service';
import { BusinessRuleError } from '@errors/app-error';
import { JWTPayload } from '@interfaces/user.dto';

describe('JWTService', () => {
  const testPayload: JWTPayload = {
    id: 'user-123',
    username: 'testuser',
    roles: ['user'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── generateToken ────────────────────────────────────────────────

  describe('generateToken', () => {
    it('When called with payload, returns a JWT string', () => {
      const token = JWTService.generateToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('When token is decoded, contains userId and roles', () => {
      const token = JWTService.generateToken(testPayload);
      const decoded = jwt.decode(token) as JWTPayload & { exp: number; iat: number };
      expect(decoded.id).toBe('user-123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.roles).toEqual(['user']);
    });

    it('When token is decoded, has expiration set', () => {
      const token = JWTService.generateToken(testPayload);
      const decoded = jwt.decode(token) as { exp: number; iat: number };
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(900); // 15 minutes
    });
  });

  // ─── generateTokenResponse ────────────────────────────────────────

  describe('generateTokenResponse', () => {
    it('When called, returns access token, refresh token, and user info', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const response = await JWTService.generateTokenResponse(testPayload);

      expect(response.token).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.username).toBe('testuser');
      expect(response.roles).toEqual(['user']);
      expect(response.expiresIn).toBeDefined();
    });

    it('When rememberMe is true, stores refresh token with 30d TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await JWTService.generateTokenResponse(testPayload, true);

      const setCalls = mockRedisClient.set.mock.calls;
      const refreshCall = setCalls.find(
        (call: unknown[]) => (call[0] as string).startsWith('refresh_token:'),
      );
      expect(refreshCall?.[2]).toEqual({ EX: 30 * 24 * 60 * 60 });
    });

    it('When rememberMe is false (default), stores refresh token with 8h TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await JWTService.generateTokenResponse(testPayload, false);

      const setCalls = mockRedisClient.set.mock.calls;
      const refreshCall = setCalls.find(
        (call: unknown[]) => (call[0] as string).startsWith('refresh_token:'),
      );
      expect(refreshCall?.[2]).toEqual({ EX: 8 * 60 * 60 });
    });
  });

  // ─── createRefreshToken ───────────────────────────────────────────

  describe('createRefreshToken', () => {
    it('When called, returns a hex string token', async () => {
      const token = await JWTService.createRefreshToken('user-123', false);
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('When called, stores hashed token in Redis', async () => {
      await JWTService.createRefreshToken('user-123', false);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token:'),
        expect.stringContaining('"userId":"user-123"'),
        expect.objectContaining({ EX: expect.any(Number) }),
      );
    });

    it('When called, adds token hash to user token set', async () => {
      await JWTService.createRefreshToken('user-123', false);

      expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
        'refresh_tokens_user:user-123',
        expect.any(String),
      );
    });
  });

  // ─── validateRefreshToken ─────────────────────────────────────────

  describe('validateRefreshToken', () => {
    it('When valid token exists in Redis, returns token data', async () => {
      const tokenData = { userId: 'user-123', rememberMe: false, createdAt: new Date().toISOString() };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData));

      const result = await JWTService.validateRefreshToken('valid-raw-token');

      expect(result.userId).toBe('user-123');
      expect(result.rememberMe).toBe(false);
    });

    it('When token does not exist in Redis, throws BusinessRuleError', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(JWTService.validateRefreshToken('invalid-token'))
        .rejects.toThrow(BusinessRuleError);
    });
  });

  // ─── revokeRefreshToken ───────────────────────────────────────────

  describe('revokeRefreshToken', () => {
    it('When token exists, removes it from Redis', async () => {
      const tokenData = { userId: 'user-123', rememberMe: false, createdAt: new Date().toISOString() };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData));

      await JWTService.revokeRefreshToken('raw-token');

      expect(mockRedisClient.del).toHaveBeenCalledWith(expect.stringContaining('refresh_token:'));
      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'refresh_tokens_user:user-123',
        expect.any(String),
      );
    });

    it('When token does not exist, does nothing', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await JWTService.revokeRefreshToken('nonexistent-token');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  // ─── revokeAllUserRefreshTokens ───────────────────────────────────

  describe('revokeAllUserRefreshTokens', () => {
    it('When user has tokens, removes all from Redis', async () => {
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.sMembers.mockResolvedValue(['hash1', 'hash2']);
      mockRedisClient.multi.mockReturnValue(mockPipeline);

      await JWTService.revokeAllUserRefreshTokens('user-123');

      expect(mockPipeline.del).toHaveBeenCalledWith('refresh_token:hash1');
      expect(mockPipeline.del).toHaveBeenCalledWith('refresh_token:hash2');
      expect(mockPipeline.del).toHaveBeenCalledWith('refresh_tokens_user:user-123');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('When user has no tokens, does not create pipeline', async () => {
      mockRedisClient.sMembers.mockResolvedValue([]);

      await JWTService.revokeAllUserRefreshTokens('user-123');

      expect(mockRedisClient.multi).not.toHaveBeenCalled();
    });
  });

  // ─── validateToken ────────────────────────────────────────────────

  describe('validateToken', () => {
    it('When valid JWT is provided, returns decoded payload', () => {
      const token = JWTService.generateToken(testPayload);
      const decoded = JWTService.validateToken(token);

      expect(decoded.id).toBe('user-123');
      expect(decoded.username).toBe('testuser');
    });

    it('When invalid JWT is provided, throws BusinessRuleError', () => {
      expect(() => JWTService.validateToken('invalid.jwt.token'))
        .toThrow(BusinessRuleError);
    });

    it('When expired JWT is provided, throws BusinessRuleError', () => {
      const expiredToken = jwt.sign(
        testPayload,
        'test-secret-key-for-testing-only',
        { expiresIn: -10 },
      );

      expect(() => JWTService.validateToken(expiredToken))
        .toThrow(BusinessRuleError);
    });
  });

  // ─── validatePassword ─────────────────────────────────────────────

  describe('validatePassword', () => {
    it('When password matches hash, returns true', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 10);

      const result = await JWTService.validatePassword('password123', hash);
      expect(result).toBe(true);
    });

    it('When password does not match hash, returns false', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 10);

      const result = await JWTService.validatePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });

  // ─── decodeToken ──────────────────────────────────────────────────

  describe('decodeToken', () => {
    it('When valid JWT is provided, returns decoded payload without verification', () => {
      const token = JWTService.generateToken(testPayload);
      const decoded = JWTService.decodeToken(token);

      expect(decoded?.id).toBe('user-123');
    });

    it('When invalid string is provided, returns null', () => {
      const decoded = JWTService.decodeToken('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });
});

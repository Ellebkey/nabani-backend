import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { addMinutes, formatISO } from 'date-fns';
import bcrypt from 'bcrypt';

import envConfig from '@config/config';
import { logger } from '@config/logger';
import { redisClient } from '@config/redis-config';

import { BusinessRuleError } from '@errors/app-error';

import { JWTPayload, JWTResponse } from '@interfaces/user.dto';

interface RefreshTokenData {
  userId: string;
  rememberMe: boolean;
  createdAt: string;
}

class JWTService {
  private readonly accessTokenMinutes: number = 15;
  private readonly accessTokenSeconds: number;
  private readonly refreshTtlShort: number = 8 * 60 * 60; // 8 hours
  private readonly refreshTtlLong: number = 30 * 24 * 60 * 60; // 30 days

  constructor() {
    this.accessTokenSeconds = 60 * this.accessTokenMinutes;
  }

  generateToken = (payload: JWTPayload): string => {
    try {
      const token = jwt.sign(
        payload,
        envConfig.jwtSecret,
        { expiresIn: this.accessTokenSeconds },
      );

      logger.info('JWT token generated', { username: payload.username });
      return token;
    } catch (error) {
      logger.error('Error generating JWT token', error);
      throw new BusinessRuleError('Failed to generate authentication token');
    }
  };

  generateTokenResponse = async (user: JWTPayload, rememberMe = false): Promise<JWTResponse> => {
    const token = this.generateToken(user);
    const expiresIn = formatISO(addMinutes(new Date(), this.accessTokenMinutes));
    const refreshToken = await this.createRefreshToken(user.id!, rememberMe);

    return {
      token,
      refreshToken,
      roles: user.roles,
      username: user.username,
      expiresIn,
    };
  };

  createRefreshToken = async (userId: string, rememberMe: boolean): Promise<string> => {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(rawToken);
    const ttl = rememberMe ? this.refreshTtlLong : this.refreshTtlShort;

    const data: RefreshTokenData = {
      userId,
      rememberMe,
      createdAt: new Date().toISOString(),
    };

    await redisClient.set(`refresh_token:${tokenHash}`, JSON.stringify(data), { EX: ttl });
    await redisClient.sAdd(`refresh_tokens_user:${userId}`, tokenHash);
    await redisClient.expire(`refresh_tokens_user:${userId}`, this.refreshTtlLong);

    return rawToken;
  };

  validateRefreshToken = async (rawToken: string): Promise<RefreshTokenData> => {
    const tokenHash = this.hashRefreshToken(rawToken);
    const stored = await redisClient.get(`refresh_token:${tokenHash}`);

    if (!stored) {
      throw new BusinessRuleError('Invalid or expired refresh token');
    }

    return JSON.parse(stored) as RefreshTokenData;
  };

  rotateRefreshToken = async (oldRawToken: string, userId: string, rememberMe: boolean): Promise<string> => {
    const oldHash = this.hashRefreshToken(oldRawToken);

    await redisClient.del(`refresh_token:${oldHash}`);
    await redisClient.sRem(`refresh_tokens_user:${userId}`, oldHash);

    return this.createRefreshToken(userId, rememberMe);
  };

  revokeRefreshToken = async (rawToken: string): Promise<string | null> => {
    const tokenHash = this.hashRefreshToken(rawToken);
    const stored = await redisClient.get(`refresh_token:${tokenHash}`);

    if (stored) {
      const data = JSON.parse(stored) as RefreshTokenData;
      await redisClient.del(`refresh_token:${tokenHash}`);
      await redisClient.sRem(`refresh_tokens_user:${data.userId}`, tokenHash);
      return data.userId;
    }

    return null;
  };

  revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
    const setKey = `refresh_tokens_user:${userId}`;
    const tokenHashes = await redisClient.sMembers(setKey);

    if (tokenHashes.length > 0) {
      const pipeline = redisClient.multi();
      tokenHashes.forEach((hash) => {
        pipeline.del(`refresh_token:${hash}`);
      });
      pipeline.del(setKey);
      await pipeline.exec();
    }

    logger.info('All refresh tokens revoked', { userId, count: tokenHashes.length });
  };

  validatePassword = async (plaintext: string, hash: string): Promise<boolean> => {
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch (error) {
      logger.error('Error validating password', error);
      return false;
    }
  };

  validateToken = (token: string): JWTPayload => {
    try {
      return jwt.verify(token, envConfig.jwtSecret) as JWTPayload;
    } catch (error) {
      logger.error('Error validating JWT token', error);
      throw new BusinessRuleError('Invalid or expired token');
    }
  };

  decodeToken = (token: string): JWTPayload | null => {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      logger.error('Error decoding JWT token', error);
      return null;
    }
  };

  private hashRefreshToken = (rawToken: string): string => crypto.createHash('sha256').update(rawToken).digest('hex');
}

export default new JWTService();

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { addMinutes, formatISO } from 'date-fns';

import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { redisClient } from '@config/redis-config';

import withTransaction from '@utils/transaction.util';
import JWTService from '@services/jwt.service';
import EmailService from '@services/email.service';

import { NotFoundError, BusinessRuleError } from '@errors/app-error';

import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ConfirmResetPasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
  LogoutDto,
  JWTResponse,
} from '@interfaces/user.dto';

class AuthService {
  private readonly jwtService: typeof JWTService;
  private readonly emailService: typeof EmailService;
  private readonly saltRounds: number = 10;
  private readonly resetTokenTtl: number = 3600;
  private readonly verifyTokenTtl: number = 86400;

  constructor() {
    this.jwtService = JWTService;
    this.emailService = EmailService;
  }

  login = async (dto: LoginDto): Promise<JWTResponse> => {
    const user = await db.User.findOne({ where: { username: dto.username } });
    const invalidCredentialsError = new BusinessRuleError('Invalid username or password');

    if (!user) {
      throw invalidCredentialsError;
    }

    const validPassword = await this.jwtService.validatePassword(dto.password, user.hashedPassword);

    if (!validPassword) {
      throw invalidCredentialsError;
    }

    if (!user.emailVerified) {
      throw new BusinessRuleError('Please verify your email before logging in');
    }

    await this.setDefaultAccount(user.id);

    // Legacy rows may store roles as a JSON string instead of an array
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles].filter(Boolean);

    const tokenResponse = await this.jwtService.generateTokenResponse(
      { id: user.id, username: user.username, roles },
      dto.rememberMe ?? false,
    );

    return { ...tokenResponse, fullname: user.fullname };
  };

  refresh = async (dto: RefreshTokenDto): Promise<JWTResponse> => {
    const tokenData = await this.jwtService.validateRefreshToken(dto.refreshToken);
    const user = await db.User.findByPk(tokenData.userId);

    if (!user) {
      throw new NotFoundError('User', tokenData.userId);
    }

    const newRefreshToken = await this.jwtService.rotateRefreshToken(
      dto.refreshToken,
      user.id,
      tokenData.rememberMe,
    );

    const token = this.jwtService.generateToken({
      id: user.id,
      username: user.username,
      roles: user.roles,
    });

    const expiresIn = formatISO(addMinutes(new Date(), 15));

    return {
      token,
      refreshToken: newRefreshToken,
      roles: user.roles,
      username: user.username,
      expiresIn,
    };
  };

  logoutWithToken = async (dto: LogoutDto): Promise<void> => {
    const userId = await this.jwtService.revokeRefreshToken(dto.refreshToken);

    if (userId) {
      await redisClient.del(`default_account_${userId}`);
      logger.info('User logged out successfully', { userId });
    }
  };

  register = async (dto: RegisterDto): Promise<void> => {
    await withTransaction(async (transaction) => {
      const hashedPassword = await this.hashPassword(dto.password);

      const userData = {
        hashedPassword,
        username: dto.username,
        email: dto.email,
        emailVerified: false,
        roles: dto.roles || ['free'],
      };

      const newUser = await db.User.create(userData, { transaction });

      logger.info('User registered', {
        userId: newUser.id,
        username: newUser.username,
      });

      const verifyToken = crypto.randomBytes(32).toString('hex');
      const redisKey = `email_verify:${verifyToken}`;

      await redisClient.set(redisKey, newUser.id, { EX: this.verifyTokenTtl });
      await this.emailService.sendEmailVerification(dto.email, verifyToken);

      logger.info('Verification email sent', { email: dto.email });
    });
  };

  changePassword = async (dto: ChangePasswordDto): Promise<void> => {
    let userId: string | undefined;

    await withTransaction(async (t) => {
      const user = await db.User.findOne({ where: { email: dto.email } });

      if (!user) {
        throw new NotFoundError('User', dto.email);
      }

      const validCurrent = await this.jwtService.validatePassword(dto.currentPassword, user.hashedPassword);

      if (!validCurrent) {
        throw new BusinessRuleError('Current password is incorrect');
      }

      const hashedPassword = await this.hashPassword(dto.newPassword);
      await user.update({ hashedPassword }, { transaction: t });
      userId = user.id;
    });

    if (userId) {
      await this.jwtService.revokeAllUserRefreshTokens(userId);
    }

    logger.info('Password changed successfully', { email: dto.email });
  };

  resetPassword = async (email: string): Promise<void> => {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      logger.warn('Password reset requested for non-existent email', { email });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const redisKey = `password_reset:${resetToken}`;

    await redisClient.set(redisKey, user.id, { EX: this.resetTokenTtl });
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    logger.info('Password reset token generated', { email });
  };

  confirmResetPassword = async (dto: ConfirmResetPasswordDto): Promise<void> => {
    const redisKey = `password_reset:${dto.token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      throw new BusinessRuleError('Invalid or expired reset token');
    }

    await withTransaction(async (t) => {
      const user = await db.User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const hashedPassword = await this.hashPassword(dto.newPassword);
      await user.update({ hashedPassword }, { transaction: t });
    });

    await redisClient.del(redisKey);
    await this.jwtService.revokeAllUserRefreshTokens(userId);

    logger.info('Password reset confirmed', { userId });
  };

  verifyEmail = async (dto: VerifyEmailDto): Promise<void> => {
    const redisKey = `email_verify:${dto.token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      throw new BusinessRuleError('Invalid or expired verification token');
    }

    await withTransaction(async (t) => {
      const user = await db.User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      if (user.emailVerified) {
        throw new BusinessRuleError('Email is already verified');
      }

      await user.update({ emailVerified: true }, { transaction: t });
    });

    await redisClient.del(redisKey);

    logger.info('Email verified', { userId });
  };

  resendVerificationEmail = async (email: string): Promise<void> => {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return;
    }

    if (user.emailVerified) {
      throw new BusinessRuleError('Email is already verified');
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const redisKey = `email_verify:${verifyToken}`;

    await redisClient.set(redisKey, user.id, { EX: this.verifyTokenTtl });
    await this.emailService.sendEmailVerification(email, verifyToken);

    logger.info('Verification email resent', { email });
  };

  hashPassword = async (password: string): Promise<string> => {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logger.error('Error hashing password', error);
      throw new BusinessRuleError('Failed to hash password');
    }
  };

  setDefaultAccount = async (userId: string): Promise<void> => {
    try {
      const defaultAccountKey = `default_account_${userId}`;
      const defaultAccountId = await redisClient.get(defaultAccountKey);

      if (!defaultAccountId) {
        logger.info('AccountId not in redis, fetching from database');
        const userConfig = await db.UserConfig.findOne({
          where: { userId },
        });

        if (userConfig && userConfig.defaultAccount) {
          await redisClient.set(defaultAccountKey, userConfig.defaultAccount);
        }
      }
    } catch (error) {
      logger.error('Error setting default account in Redis', error);
    }
  };
}

export default new AuthService();

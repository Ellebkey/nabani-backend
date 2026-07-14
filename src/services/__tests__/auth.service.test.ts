jest.mock('@config/sequelize', () => ({
  db: {
    User: {
      create: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    UserConfig: {
      findOne: jest.fn(),
    },
  },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), log: jest.fn() },
}));

const mockRedisClient = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('@config/redis-config', () => ({
  redisClient: mockRedisClient,
}));

jest.mock('@utils/transaction.util', () => require('../../test/unit/mocks/transaction.util.mock'));

jest.mock('@services/jwt.service', () => ({
  __esModule: true,
  default: {
    validatePassword: jest.fn(),
    generateTokenResponse: jest.fn(),
    generateToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllUserRefreshTokens: jest.fn(),
  },
}));

jest.mock('@services/email.service', () => ({
  __esModule: true,
  default: {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '@config/sequelize';
import AuthService from '@services/auth.service';
import JWTService from '@services/jwt.service';
import EmailService from '@services/email.service';
import { BusinessRuleError, NotFoundError } from '@errors/app-error';
import {
  makeLoginDto, makeRegisterDto, makeUserInstance, makeJWTResponse,
} from '../../test/factories/auth.factory';

const mockDb = db as unknown as {
  User: { create: jest.Mock; findOne: jest.Mock; findByPk: jest.Mock };
  UserConfig: { findOne: jest.Mock };
};
const mockJwt = JWTService as unknown as {
  validatePassword: jest.Mock;
  generateTokenResponse: jest.Mock;
  generateToken: jest.Mock;
  rotateRefreshToken: jest.Mock;
  validateRefreshToken: jest.Mock;
  revokeRefreshToken: jest.Mock;
  revokeAllUserRefreshTokens: jest.Mock;
};
const mockEmail = EmailService as unknown as {
  sendEmailVerification: jest.Mock;
  sendPasswordResetEmail: jest.Mock;
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── login ────────────────────────────────────────────────────────

  describe('login', () => {
    it('When credentials are valid, returns JWT response', async () => {
      const user = makeUserInstance();
      mockDb.User.findOne.mockResolvedValue(user);
      mockJwt.validatePassword.mockResolvedValue(true);
      const jwtResponse = makeJWTResponse();
      mockJwt.generateTokenResponse.mockResolvedValue(jwtResponse);

      const result = await AuthService.login(makeLoginDto());

      expect(result).toEqual(jwtResponse);
      expect(mockJwt.validatePassword).toHaveBeenCalledWith('Password123!', user.hashedPassword);
    });

    it('When username does not exist, throws BusinessRuleError', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      await expect(AuthService.login(makeLoginDto())).rejects.toThrow(BusinessRuleError);
    });

    it('When password is incorrect, throws BusinessRuleError', async () => {
      mockDb.User.findOne.mockResolvedValue(makeUserInstance());
      mockJwt.validatePassword.mockResolvedValue(false);

      await expect(AuthService.login(makeLoginDto())).rejects.toThrow(BusinessRuleError);
    });

    it('When email is not verified, throws BusinessRuleError', async () => {
      mockDb.User.findOne.mockResolvedValue(makeUserInstance({ emailVerified: false }));
      mockJwt.validatePassword.mockResolvedValue(true);

      await expect(AuthService.login(makeLoginDto())).rejects.toThrow(BusinessRuleError);
    });

    it('When rememberMe is true, passes it to generateTokenResponse', async () => {
      mockDb.User.findOne.mockResolvedValue(makeUserInstance());
      mockJwt.validatePassword.mockResolvedValue(true);
      mockJwt.generateTokenResponse.mockResolvedValue(makeJWTResponse());

      await AuthService.login(makeLoginDto({ rememberMe: true }));

      expect(mockJwt.generateTokenResponse).toHaveBeenCalledWith(
        expect.any(Object),
        true,
      );
    });
  });

  // ─── register ─────────────────────────────────────────────────────

  describe('register', () => {
    it('When registration succeeds, creates user and sends verification email', async () => {
      const newUser = makeUserInstance({ id: 'new-user-id' });
      mockDb.User.create.mockResolvedValue(newUser);

      await AuthService.register(makeRegisterDto());

      expect(mockDb.User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'newuser@test.com',
          emailVerified: false,
        }),
        expect.any(Object),
      );
      expect(mockEmail.sendEmailVerification).toHaveBeenCalledWith(
        'newuser@test.com',
        expect.any(String),
      );
    });

    it('When registration succeeds, hashes the password', async () => {
      mockDb.User.create.mockResolvedValue(makeUserInstance());

      await AuthService.register(makeRegisterDto());

      const createCall = mockDb.User.create.mock.calls[0][0];
      expect(createCall.hashedPassword).toBeDefined();
      expect(createCall.hashedPassword).not.toBe('Password123!');
    });

    it('When registration succeeds, stores verification token in Redis', async () => {
      mockDb.User.create.mockResolvedValue(makeUserInstance());

      await AuthService.register(makeRegisterDto());

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('email_verify:'),
        expect.any(String),
        expect.objectContaining({ EX: expect.any(Number) }),
      );
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────

  describe('refresh', () => {
    it('When refresh token is valid, returns new token response', async () => {
      mockJwt.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
        rememberMe: false,
      });
      mockDb.User.findByPk.mockResolvedValue(makeUserInstance({ id: 'user-123' }));
      mockJwt.rotateRefreshToken.mockResolvedValue('new-refresh-token');
      mockJwt.generateToken.mockReturnValue('new-access-token');

      const result = await AuthService.refresh({ refreshToken: 'old-token' });

      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('When refresh token is invalid, throws BusinessRuleError', async () => {
      mockJwt.validateRefreshToken.mockRejectedValue(
        new BusinessRuleError('Invalid or expired refresh token'),
      );

      await expect(
        AuthService.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('When user no longer exists, throws NotFoundError', async () => {
      mockJwt.validateRefreshToken.mockResolvedValue({ userId: 'deleted-user' });
      mockDb.User.findByPk.mockResolvedValue(null);

      await expect(
        AuthService.refresh({ refreshToken: 'valid-token' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────

  describe('changePassword', () => {
    it('When current password is correct, updates password and revokes tokens', async () => {
      const user = makeUserInstance();
      mockDb.User.findOne.mockResolvedValue(user);
      mockJwt.validatePassword.mockResolvedValue(true);

      await AuthService.changePassword({
        email: 'testuser@test.com',
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!',
      });

      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ hashedPassword: expect.any(String) }),
        expect.any(Object),
      );
      expect(mockJwt.revokeAllUserRefreshTokens).toHaveBeenCalled();
    });

    it('When current password is wrong, throws BusinessRuleError', async () => {
      mockDb.User.findOne.mockResolvedValue(makeUserInstance());
      mockJwt.validatePassword.mockResolvedValue(false);

      await expect(
        AuthService.changePassword({
          email: 'testuser@test.com',
          currentPassword: 'wrong',
          newPassword: 'New123!',
        }),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('When user not found, throws NotFoundError', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      await expect(
        AuthService.changePassword({
          email: 'nonexistent@test.com',
          currentPassword: 'any',
          newPassword: 'any',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('When user exists, sends reset email', async () => {
      mockDb.User.findOne.mockResolvedValue(makeUserInstance());

      await AuthService.resetPassword('testuser@test.com');

      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
        'testuser@test.com',
        expect.any(String),
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('password_reset:'),
        expect.any(String),
        expect.objectContaining({ EX: expect.any(Number) }),
      );
    });

    it('When user does not exist, does not throw (prevents email enumeration)', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      await expect(AuthService.resetPassword('nonexistent@test.com')).resolves.not.toThrow();
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ─── confirmResetPassword ─────────────────────────────────────────

  describe('confirmResetPassword', () => {
    it('When valid token, updates password and revokes tokens', async () => {
      const user = makeUserInstance();
      mockRedisClient.get.mockResolvedValue('user-123');
      mockDb.User.findByPk.mockResolvedValue(user);

      await AuthService.confirmResetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ hashedPassword: expect.any(String) }),
        expect.any(Object),
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('password_reset:valid-reset-token');
      expect(mockJwt.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-123');
    });

    it('When invalid/expired token, throws BusinessRuleError', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        AuthService.confirmResetPassword({
          token: 'expired-token',
          newPassword: 'New123!',
        }),
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('When valid token, marks email as verified', async () => {
      const user = makeUserInstance({ emailVerified: false });
      mockRedisClient.get.mockResolvedValue('user-123');
      mockDb.User.findByPk.mockResolvedValue(user);

      await AuthService.verifyEmail({ token: 'verify-token' });

      expect(user.update).toHaveBeenCalledWith(
        { emailVerified: true },
        expect.any(Object),
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('email_verify:verify-token');
    });

    it('When invalid token, throws BusinessRuleError', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        AuthService.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('When email already verified, throws BusinessRuleError', async () => {
      mockRedisClient.get.mockResolvedValue('user-123');
      mockDb.User.findByPk.mockResolvedValue(makeUserInstance({ emailVerified: true }));

      await expect(
        AuthService.verifyEmail({ token: 'valid-token' }),
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  // ─── logoutWithToken ──────────────────────────────────────────────

  describe('logoutWithToken', () => {
    it('When called, revokes refresh token and clears Redis cache', async () => {
      mockJwt.revokeRefreshToken.mockResolvedValue('user-123');

      await AuthService.logoutWithToken({ refreshToken: 'my-token' });

      expect(mockJwt.revokeRefreshToken).toHaveBeenCalledWith('my-token');
      expect(mockRedisClient.del).toHaveBeenCalledWith('default_account_user-123');
    });

    it('When refresh token is invalid, still revokes and does not throw', async () => {
      mockJwt.revokeRefreshToken.mockResolvedValue(null);

      await AuthService.logoutWithToken({ refreshToken: 'bad-token' });

      expect(mockJwt.revokeRefreshToken).toHaveBeenCalledWith('bad-token');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  // ─── resendVerificationEmail ──────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('When user exists and not verified, sends new email', async () => {
      mockDb.User.findOne.mockResolvedValue(
        makeUserInstance({ emailVerified: false }),
      );

      await AuthService.resendVerificationEmail('testuser@test.com');

      expect(mockEmail.sendEmailVerification).toHaveBeenCalledWith(
        'testuser@test.com',
        expect.any(String),
      );
    });

    it('When user does not exist, does not throw', async () => {
      mockDb.User.findOne.mockResolvedValue(null);

      await expect(
        AuthService.resendVerificationEmail('nonexistent@test.com'),
      ).resolves.not.toThrow();
    });

    it('When email already verified, throws BusinessRuleError', async () => {
      mockDb.User.findOne.mockResolvedValue(
        makeUserInstance({ emailVerified: true }),
      );

      await expect(
        AuthService.resendVerificationEmail('testuser@test.com'),
      ).rejects.toThrow(BusinessRuleError);
    });
  });
});

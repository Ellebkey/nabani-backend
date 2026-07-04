jest.mock('@services/auth.service', () => require('../../test/unit/mocks/auth.service.mock'));
jest.mock('@utils/validation.util', () => require('../../test/unit/mocks/validation.util.mock'));

import AuthController from '@controllers/auth.controller';
import AuthService from '@services/auth.service';
import { validateDto } from '@utils/validation.util';
import { ValidationError, BusinessRuleError } from '@errors/app-error';
import { makeJWTResponse } from '../../test/factories/auth.factory';
import { makeMockReq, makeMockRes } from '../../test/helpers/mock-express';

const mockService = AuthService as jest.Mocked<typeof AuthService>;

describe('AuthController', () => {
  let res: ReturnType<typeof makeMockRes>;
  let next: jest.Mock;

  beforeEach(() => {
    res = makeMockRes();
    next = jest.fn();
  });

  // ─── login ────────────────────────────────────────────────────────

  describe('login', () => {
    it('When credentials are valid, returns JWT response', async () => {
      const jwtResponse = makeJWTResponse();
      mockService.login.mockResolvedValue(jwtResponse);

      await AuthController.login(
        makeMockReq({ body: { username: 'test', password: 'pass' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(jwtResponse);
    });

    it('When validation fails, forwards ValidationError to next', async () => {
      (validateDto as jest.Mock).mockImplementationOnce(() => {
        throw new ValidationError('Validation failed', []);
      });

      await AuthController.login(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('When service throws, forwards error to next', async () => {
      mockService.login.mockRejectedValue(new BusinessRuleError('Invalid credentials'));

      await AuthController.login(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BusinessRuleError));
    });
  });

  // ─── register ─────────────────────────────────────────────────────

  describe('register', () => {
    it('When registration succeeds, returns 201 with success message', async () => {
      mockService.register.mockResolvedValue(undefined);

      await AuthController.register(
        makeMockReq({ body: { username: 'new', password: 'pass', email: 'e@e.com' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('When validation fails, forwards error to next', async () => {
      (validateDto as jest.Mock).mockImplementationOnce(() => {
        throw new ValidationError('Validation failed', []);
      });

      await AuthController.register(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('When service throws, forwards error to next', async () => {
      mockService.register.mockRejectedValue(new Error('Duplicate'));

      await AuthController.register(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────

  describe('refresh', () => {
    it('When refresh token is valid, returns new token response', async () => {
      const jwtResponse = makeJWTResponse();
      mockService.refresh.mockResolvedValue(jwtResponse);

      await AuthController.refresh(
        makeMockReq({ body: { refreshToken: 'valid-token' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(jwtResponse);
    });

    it('When service throws, forwards error to next', async () => {
      mockService.refresh.mockRejectedValue(new BusinessRuleError('Invalid token'));

      await AuthController.refresh(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BusinessRuleError));
    });
  });

  // ─── changePassword ───────────────────────────────────────────────

  describe('changePassword', () => {
    it('When password change succeeds, returns success message', async () => {
      mockService.changePassword.mockResolvedValue(undefined);

      await AuthController.changePassword(
        makeMockReq({
          body: { currentPassword: 'old', newPassword: 'new' },
          user: { id: 'user-1', roles: ['user'], username: 'testuser@test.com' },
        }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('When service throws, forwards error to next', async () => {
      mockService.changePassword.mockRejectedValue(
        new BusinessRuleError('Current password is incorrect'),
      );

      await AuthController.changePassword(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BusinessRuleError));
    });
  });

  // ─── logout ───────────────────────────────────────────────────────

  describe('logout', () => {
    it('When logout succeeds, returns success message', async () => {
      mockService.logoutWithToken.mockResolvedValue(undefined);

      await AuthController.logout(
        makeMockReq({ body: { refreshToken: 'token' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('When service throws, forwards error to next', async () => {
      mockService.logoutWithToken.mockRejectedValue(
        new BusinessRuleError('Invalid refresh token'),
      );

      await AuthController.logout(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BusinessRuleError));
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('When called, returns success message regardless of email existence', async () => {
      mockService.resetPassword.mockResolvedValue(undefined);

      await AuthController.resetPassword(
        makeMockReq({ body: { email: 'test@test.com' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ─── confirmResetPassword ─────────────────────────────────────────

  describe('confirmResetPassword', () => {
    it('When token is valid, returns success message', async () => {
      mockService.confirmResetPassword.mockResolvedValue(undefined);

      await AuthController.confirmResetPassword(
        makeMockReq({ body: { token: 'reset-token', newPassword: 'New123!' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('When service throws, forwards error to next', async () => {
      mockService.confirmResetPassword.mockRejectedValue(
        new BusinessRuleError('Invalid token'),
      );

      await AuthController.confirmResetPassword(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BusinessRuleError));
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('When token is valid, returns success message', async () => {
      mockService.verifyEmail.mockResolvedValue(undefined);

      await AuthController.verifyEmail(
        makeMockReq({ body: { token: 'verify-token' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ─── resendVerificationEmail ──────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('When called, returns success message', async () => {
      mockService.resendVerificationEmail.mockResolvedValue(undefined);

      await AuthController.resendVerificationEmail(
        makeMockReq({ body: { email: 'test@test.com' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});

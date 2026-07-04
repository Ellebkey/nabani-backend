import { Router } from 'express';

import authController from '@controllers/auth.controller';
import Auth from '@middlewares/auth';
import { authRateLimiter } from '@middlewares/rate-limit.middleware';
import '@validations/auth.validation';

export class AuthRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() {
    this.init();
  }

  private init(): void {
    this.router.route('/auth/login')
      .post(authRateLimiter, authController.login);

    this.router.route('/auth/register')
      .post(authRateLimiter, authController.register);

    this.router.route('/auth/change-password')
      .all(this.canAccess)
      .post(authController.changePassword);

    this.router.route('/auth/reset-password')
      .post(authRateLimiter, authController.resetPassword);

    this.router.route('/auth/confirm-reset-password')
      .post(authRateLimiter, authController.confirmResetPassword);

    this.router.route('/auth/verify-email')
      .post(authRateLimiter, authController.verifyEmail);

    this.router.route('/auth/resend-verification')
      .post(authRateLimiter, authController.resendVerificationEmail);

    this.router.route('/auth/refresh')
      .post(authRateLimiter, authController.refresh);

    this.router.route('/auth/logout')
      .post(authRateLimiter, authController.logout);
  }
}

export default new AuthRoute().router;

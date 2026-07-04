import { Request, Response, NextFunction } from 'express';

import { validateDto } from '@utils/validation.util';
import AuthService from '@services/auth.service';

import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
  LogoutDto,
} from '@interfaces/user.dto';

class AuthController {
  private authService: typeof AuthService;

  constructor() {
    this.authService = AuthService;
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<LoginDto>('login', req.body);
      const loginResponse = await this.authService.login(dto);
      return res.json(loginResponse);
    } catch (error) {
      return next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<RegisterDto>('register', req.body);
      await this.authService.register(dto);
      return res.status(201).json({
        success: true,
        message: 'Account created. Please check your email to verify your account.',
      });
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { currentPassword, newPassword } = validateDto<Omit<ChangePasswordDto, 'email'>>(
        'changePassword', req.body,
      );
      await this.authService.changePassword({
        email: req.user!.username,
        currentPassword,
        newPassword,
      });
      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Sends a password reset email with a time-limited token.
   * Always returns success to prevent email enumeration.
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<ResetPasswordDto>('resetPassword', req.body);
      await this.authService.resetPassword(dto.email);
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      return next(error);
    }
  };

  confirmResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<ConfirmResetPasswordDto>('confirmResetPassword', req.body);
      await this.authService.confirmResetPassword(dto);
      return res.json({
        success: true,
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      return next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<VerifyEmailDto>('verifyEmail', req.body);
      await this.authService.verifyEmail(dto);
      return res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      return next(error);
    }
  };

  resendVerificationEmail = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<ResetPasswordDto>('resetPassword', req.body);
      await this.authService.resendVerificationEmail(dto.email);
      return res.json({
        success: true,
        message: 'If the email exists, a verification link has been sent',
      });
    } catch (error) {
      return next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<RefreshTokenDto>('refreshToken', req.body);
      const tokenResponse = await this.authService.refresh(dto);
      return res.json(tokenResponse);
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<LogoutDto>('logout', req.body);
      await this.authService.logoutWithToken(dto);
      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      return next(error);
    }
  };
}

export default new AuthController();

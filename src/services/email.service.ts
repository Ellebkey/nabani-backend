import { Resend } from 'resend';

import envConfig from '@config/config';
import { logger } from '@config/logger';

import { BusinessRuleError } from '@errors/app-error';

class EmailService {
  private readonly resend: Resend | null;
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = !!envConfig.resend.apiKey;
    this.resend = this.isConfigured ? new Resend(envConfig.resend.apiKey) : null;
  }

  sendPasswordResetEmail = async (to: string, resetToken: string): Promise<void> => {
    const resetUrl = `${envConfig.frontendUrl}/#/authentication/reset-password?token=${resetToken}`;
    const btnStyle = 'display:inline-block;padding:12px 24px;background-color:#2a4c3c;'
      + 'color:#fff;text-decoration:none;border-radius:6px;margin:16px 0';

    await this.send({
      to,
      subject: 'Restablecer tu contraseña — Maguey',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2a4c3c;">Restablecer contraseña</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <a href="${resetUrl}" style="${btnStyle}">
            Restablecer contraseña
          </a>
          <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora.</p>
          <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
    });

    logger.info('Password reset email sent', { to });
  };

  sendEmailVerification = async (to: string, verificationToken: string): Promise<void> => {
    const verifyUrl = `${envConfig.frontendUrl}/#/authentication/verify-email?token=${verificationToken}`;
    const btnStyle = 'display:inline-block;padding:12px 24px;background-color:#2a4c3c;'
      + 'color:#fff;text-decoration:none;border-radius:6px;margin:16px 0';

    await this.send({
      to,
      subject: 'Verifica tu correo electrónico — Maguey',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2a4c3c;">Bienvenido a Maguey</h2>
          <p>Gracias por registrarte. Por favor verifica tu correo electrónico:</p>
          <a href="${verifyUrl}" style="${btnStyle}">
            Verificar correo
          </a>
          <p style="color: #666; font-size: 14px;">Este enlace expira en 24 horas.</p>
        </div>
      `,
    });

    logger.info('Email verification sent', { to });
  };

  private send = async (msg: { to: string; subject: string; html: string }): Promise<void> => {
    if (!this.isConfigured || !this.resend) {
      logger.warn('Resend not configured, skipping email', { to: msg.to, subject: msg.subject });
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: envConfig.resend.fromEmail,
        ...msg,
      });

      if (error) {
        logger.error('Resend API error', { to: msg.to, error });
        throw new BusinessRuleError('Failed to send email');
      }
    } catch (err) {
      if (err instanceof BusinessRuleError) {
        throw err;
      }
      logger.error('Failed to send email', { to: msg.to, error: err as Error });
      throw new BusinessRuleError('Failed to send email');
    }
  };
}

export default new EmailService();

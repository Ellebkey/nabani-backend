import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const authValidationSchemas = {
  login: Joi.object({
    username: Joi.string()
      .required()
      .email()
      .min(1)
      .max(100)
      .trim(),
    password: Joi.string()
      .required()
      .min(1),
    rememberMe: Joi.boolean()
      .optional()
      .default(false),
  }),

  register: Joi.object({
    username: Joi.string()
      .email()
      .required()
      .min(1)
      .max(100)
      .trim(),
    password: Joi.string()
      .required()
      .min(6)
      .max(100),
    email: Joi.string()
      .email()
      .required()
      .min(1)
      .max(100)
      .trim(),
    displayName: Joi.string()
      .optional()
      .max(100)
      .trim(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .min(1),
    newPassword: Joi.string()
      .required()
      .min(6)
      .max(100),
  }),

  resetPassword: Joi.object({
    email: Joi.string()
      .required()
      .email()
      .trim(),
  }),

  confirmResetPassword: Joi.object({
    token: Joi.string()
      .required()
      .trim(),
    newPassword: Joi.string()
      .required()
      .min(6)
      .max(100),
  }),

  verifyEmail: Joi.object({
    token: Joi.string()
      .required()
      .trim(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .trim(),
  }),

  logout: Joi.object({
    refreshToken: Joi.string()
      .required()
      .trim(),
  }),
};

registerSchemas(authValidationSchemas);

export default authValidationSchemas;

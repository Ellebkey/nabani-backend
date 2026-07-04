import { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import envConfig from '@config/config';

const noopMiddleware: RequestHandler = (_req, _res, next) => next();

/**
 * Strict rate limiter for authentication endpoints (login, register, reset-password).
 * 10 requests per 15-minute window per IP.
 * Disabled in test environment to prevent 429 errors during integration tests.
 */
const authRateLimiter = envConfig.env === 'test'
  ? noopMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later', status: 429 },
      },
    });

/**
 * General rate limiter for all API routes.
 * 100 requests per minute per IP.
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later', status: 429 } },
});

export { authRateLimiter, apiRateLimiter };

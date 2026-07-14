import { Request, Response, NextFunction } from 'express';

import { logger } from '@config/logger';
import { getRequestContext } from '@config/request-context';

// Paths that only add noise to access logs (swagger assets, favicons)
const SKIP_PREFIXES = ['/api-docs', '/favicon'];

/**
 * Access logging for ALL environments at the `http` level (one line per
 * completed request). In production the default LOG_LEVEL is `http`, so these
 * lines ship to Loki and power rate/latency/status dashboards; set
 * LOG_LEVEL=info to silence them without touching application logs.
 */
export const httpLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const start = process.hrtime.bigint();

  // Request-start line is debug-only: useful while developing, noise in prod
  logger.debug(`→ ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
  });

  // 'finish'/'close' listeners can fire outside the AsyncLocalStorage scope
  // (e.g. client aborts surface from the socket), so capture the context now.
  const ctx = getRequestContext();

  let logged = false;
  const logCompletion = (aborted: boolean): void => {
    if (logged) {
      return;
    }
    logged = true;

    // Convert to Number before dividing so fast responses keep sub-ms resolution
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10;
    const contentLength = res.getHeader('content-length');

    logger.http(`${req.method} ${res.statusCode} ${req.originalUrl} ${durationMs}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ...(ctx?.requestId !== undefined && { requestId: ctx.requestId }),
      // req.user is attached by the auth middleware after this one registers,
      // but before the response finishes — so it is readable here.
      ...(req.user?.id !== undefined && { userId: req.user.id }),
      ...(contentLength !== undefined && { bytes: Number(contentLength) }),
      ...(aborted && { aborted: true }),
    });
  };

  res.on('finish', () => logCompletion(false));
  res.on('close', () => logCompletion(true));
  next();
};

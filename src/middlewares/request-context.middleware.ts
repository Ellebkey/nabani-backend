import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { runWithRequestContext } from '@config/request-context';

// Accept a caller-provided id only when it is short and unambiguous — anything
// else (oversized values, log-injection attempts) is replaced with a fresh UUID.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Opens the per-request correlation scope. Must be the FIRST middleware so
 * every log line — including rate-limited and failed requests — carries a
 * `requestId`. The id is echoed back as `X-Request-Id` so the frontend (and
 * error responses) can reference the exact server-side trace.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header('X-Request-Id');
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  res.setHeader('X-Request-Id', requestId);
  runWithRequestContext({ requestId }, next);
};

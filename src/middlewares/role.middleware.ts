import {
  Request, Response, NextFunction, RequestHandler,
} from 'express';

import { ForbiddenError } from '@errors/app-error';

/**
 * Middleware factory that restricts access to users with specific roles.
 * Must be used AFTER auth middleware (requires req.user to be set).
 */
function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles ?? [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(new ForbiddenError('Access denied: insufficient privileges'));
    }

    return next();
  };
}

export { requireRole };

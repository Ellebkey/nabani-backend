import {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';

import { setRequestContext } from '@config/request-context';

import JWTService from '@services/jwt.service';
import ApiKeyService from '@services/api-key.service';

import { UnauthorizedError, ForbiddenError } from '@errors/app-error';

import { JWTPayload } from '@interfaces/user.dto';

interface CombinedAuthOptions {
  /** Scope an API key must carry to pass (e.g. 'drafts:write'). */
  scope: string;
  /** Roles a JWT user must have to pass (unchanged from the existing gate). */
  roles: string[];
}

/**
 * Combined guard: authenticates with EITHER an API key (`X-API-Key`) OR a JWT
 * (`Authorization`), so an endpoint can be reached by both trusted first-party
 * sessions and external server-to-server integrations.
 *
 * - API-key requests are authorized by SCOPE (least-privilege): the key's user
 *   is resolved onto `req.user`, and the role gate is intentionally bypassed.
 * - JWT requests keep the EXACT existing behavior: validate the token, then
 *   require one of `roles`. Token failures map to 401 (so the frontend can
 *   refresh), authorization failures to 403.
 *
 * Endpoints that keep using `Auth.checkAuth` + `requireRole` are unaffected —
 * only routes that opt into this guard accept API keys. Extend to new endpoints
 * by mounting `apiKeyOrJwt({ scope, roles })` with the appropriate scope.
 */

export function apiKeyOrJwt({ scope, roles }: CombinedAuthOptions): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const apiKeyHeader = req.header('X-API-Key');

    if (apiKeyHeader) {
      try {
        const { apiKey, user } = await ApiKeyService.authenticate(apiKeyHeader);
        if (!apiKey.scopes.includes(scope)) {
          return next(new ForbiddenError(`API key is missing the required scope: ${scope}`));
        }
        req.user = user;
        req.auth = { method: 'apikey', apiKeyId: apiKey.id, scopes: apiKey.scopes };
        setRequestContext({ userId: user.id, apiKeyId: apiKey.id });
        return next();
      } catch (error) {
        return next(error);
      }
    }

    const token = req.headers.authorization;
    if (token) {
      let user: JWTPayload;
      try {
        user = JWTService.validateToken(token);
      } catch {
        // Mirror Auth.checkAuth: surface a 401 so the frontend interceptor can refresh.
        return next(new UnauthorizedError('Token authentication failed'));
      }

      req.user = user;
      req.auth = { method: 'jwt' };
      setRequestContext({ userId: user.id });

      const userRoles = user.roles ?? [];
      if (!roles.some((role) => userRoles.includes(role))) {
        return next(new ForbiddenError('Access denied: insufficient privileges'));
      }
      return next();
    }

    return next(new UnauthorizedError('Authentication required: provide an X-API-Key or Authorization header'));
  };
}

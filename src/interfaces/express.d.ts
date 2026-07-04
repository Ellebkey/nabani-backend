import { JWTPayload } from '@interfaces/user.dto';

/**
 * How the current request was authenticated. `method` is set by the combined
 * guard (`apiKeyOrJwt`); `apiKeyId`/`scopes` are present only for API-key auth.
 */
export interface RequestAuthContext {
  method: 'jwt' | 'apikey';
  apiKeyId?: number;
  scopes?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      auth?: RequestAuthContext;
    }
  }
}

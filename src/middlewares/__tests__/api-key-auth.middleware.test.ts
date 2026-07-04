jest.mock('@services/api-key.service', () => ({
  __esModule: true,
  default: { authenticate: jest.fn() },
}));
jest.mock('@services/jwt.service', () => ({
  __esModule: true,
  default: { validateToken: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { apiKeyOrJwt } from '@middlewares/api-key-auth.middleware';
import ApiKeyService from '@services/api-key.service';
import JWTService from '@services/jwt.service';
import { UnauthorizedError, ForbiddenError } from '@errors/app-error';

const mockApiKeyService = ApiKeyService as unknown as { authenticate: jest.Mock };
const mockJwtService = JWTService as unknown as { validateToken: jest.Mock };

// The guard is async; RequestHandler is typed as sync-returning, so await via this alias.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const middleware = apiKeyOrJwt({ scope: 'drafts:write', roles: ['premium', 'admin'] }) as unknown as AsyncHandler;

function makeMockReq(
  { apiKey, authorization }: { apiKey?: string; authorization?: string } = {},
): Request {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers,
    header: (name: string): string | undefined =>
      (name.toLowerCase() === 'x-api-key' ? apiKey : headers[name.toLowerCase()]),
  } as unknown as Request;
}

describe('apiKeyOrJwt combined guard', () => {
  let next: jest.Mock;

  const invoke = (req: Request): Promise<void> => middleware(req, {} as Response, next);

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('API key path', () => {
    it('When key is valid and has the scope, sets req.user + req.auth and calls next', async () => {
      const user = { id: 'user-1', username: 'a@b.com', roles: ['free'] };
      mockApiKeyService.authenticate.mockResolvedValue({
        apiKey: { id: 7, scopes: ['drafts:write'] },
        user,
      });

      const req = makeMockReq({ apiKey: 'mgk_live_validkey' });
      await invoke(req);

      expect(mockApiKeyService.authenticate).toHaveBeenCalledWith('mgk_live_validkey');
      // Scope authorizes even though the key's user is NOT premium/admin.
      expect(req.user).toEqual(user);
      expect(req.auth).toEqual({ method: 'apikey', apiKeyId: 7, scopes: ['drafts:write'] });
      expect(next).toHaveBeenCalledWith();
      expect(mockJwtService.validateToken).not.toHaveBeenCalled();
    });

    it('When key is valid but MISSING the scope, calls next with ForbiddenError', async () => {
      mockApiKeyService.authenticate.mockResolvedValue({
        apiKey: { id: 8, scopes: ['other:read'] },
        user: { id: 'user-1', username: 'a@b.com', roles: ['premium'] },
      });

      await invoke(makeMockReq({ apiKey: 'mgk_live_scopeless' }));

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('When key is REVOKED, propagates the UnauthorizedError from the service', async () => {
      mockApiKeyService.authenticate.mockRejectedValue(new UnauthorizedError('API key has been revoked'));

      await invoke(makeMockReq({ apiKey: 'mgk_live_revoked' }));

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('When key is EXPIRED, propagates the UnauthorizedError from the service', async () => {
      mockApiKeyService.authenticate.mockRejectedValue(new UnauthorizedError('API key has expired'));

      await invoke(makeMockReq({ apiKey: 'mgk_live_expired' }));

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('When key is UNKNOWN/nonexistent, propagates the UnauthorizedError from the service', async () => {
      mockApiKeyService.authenticate.mockRejectedValue(new UnauthorizedError('Invalid API key'));

      await invoke(makeMockReq({ apiKey: 'mgk_live_ghost' }));

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('JWT path (must keep working)', () => {
    it('When JWT is valid and has a required role, sets req.user + req.auth and calls next', async () => {
      const user = { id: 'user-2', username: 'x@y.com', roles: ['premium'] };
      mockJwtService.validateToken.mockReturnValue(user);

      const req = makeMockReq({ authorization: 'valid-jwt' });
      await invoke(req);

      expect(mockJwtService.validateToken).toHaveBeenCalledWith('valid-jwt');
      expect(req.user).toEqual(user);
      expect(req.auth).toEqual({ method: 'jwt' });
      expect(next).toHaveBeenCalledWith();
      expect(mockApiKeyService.authenticate).not.toHaveBeenCalled();
    });

    it('When JWT is valid but the user LACKS the role, calls next with ForbiddenError', async () => {
      mockJwtService.validateToken.mockReturnValue({ id: 'user-3', username: 'x', roles: ['free'] });

      await invoke(makeMockReq({ authorization: 'valid-but-free' }));

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('When JWT is invalid, calls next with UnauthorizedError', async () => {
      mockJwtService.validateToken.mockImplementation(() => {
        throw new Error('Invalid or expired token');
      });

      await invoke(makeMockReq({ authorization: 'bad-jwt' }));

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  it('When neither X-API-Key nor Authorization is present, calls next with UnauthorizedError', async () => {
    await invoke(makeMockReq());

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockApiKeyService.authenticate).not.toHaveBeenCalled();
    expect(mockJwtService.validateToken).not.toHaveBeenCalled();
  });
});

jest.mock('@services/jwt.service', () => ({
  __esModule: true,
  default: {
    validateToken: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import Auth from '@middlewares/auth';
import JWTService from '@services/jwt.service';
import { UnauthorizedError } from '@errors/app-error';

const mockJwtService = JWTService as unknown as { validateToken: jest.Mock };

function makeMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeMockRes(): Response {
  return {} as unknown as Response;
}

describe('Auth middleware', () => {
  let auth: Auth;
  let next: jest.Mock;

  beforeEach(() => {
    auth = new Auth();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('When valid token is provided, attaches user to req and calls next', () => {
    const userPayload = { id: 'user-123', username: 'testuser', roles: ['user'] };
    mockJwtService.validateToken.mockReturnValue(userPayload);

    const req = makeMockReq({ headers: { authorization: 'valid-token' } });
    auth.checkAuth(req, makeMockRes(), next);

    expect(mockJwtService.validateToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual(userPayload);
    expect(next).toHaveBeenCalledWith();
  });

  it('When no authorization header, calls next with UnauthorizedError', () => {
    const req = makeMockReq({ headers: {} });
    auth.checkAuth(req, makeMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockJwtService.validateToken).not.toHaveBeenCalled();
  });

  it('When authorization header is empty string, calls next with UnauthorizedError', () => {
    const req = makeMockReq({ headers: { authorization: '' } });
    auth.checkAuth(req, makeMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('When token validation throws, calls next with UnauthorizedError', () => {
    mockJwtService.validateToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = makeMockReq({ headers: { authorization: 'invalid-token' } });
    auth.checkAuth(req, makeMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('When expired token is provided, calls next with UnauthorizedError', () => {
    mockJwtService.validateToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = makeMockReq({ headers: { authorization: 'expired-token' } });
    auth.checkAuth(req, makeMockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

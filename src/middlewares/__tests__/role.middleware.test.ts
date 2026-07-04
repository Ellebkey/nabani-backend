import { Request, Response } from 'express';
import { requireRole } from '@middlewares/role.middleware';
import { ForbiddenError } from '@errors/app-error';

function makeMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: { id: 'user-123', roles: ['user'] },
    ...overrides,
  } as unknown as Request;
}

describe('requireRole middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('When user has required role, calls next without error', () => {
    const middleware = requireRole('admin');
    const req = makeMockReq({ user: { id: 'admin-1', roles: ['admin'] } });

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('When user does not have required role, calls next with ForbiddenError', () => {
    const middleware = requireRole('admin');
    const req = makeMockReq({ user: { id: 'user-1', roles: ['user'] } });

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('When multiple roles allowed and user has one, calls next without error', () => {
    const middleware = requireRole('admin', 'moderator');
    const req = makeMockReq({ user: { id: 'mod-1', roles: ['moderator'] } });

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('When user has no roles array, calls next with ForbiddenError', () => {
    const middleware = requireRole('admin');
    const req = makeMockReq({ user: { id: 'user-1' } });

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('When req.user is undefined, calls next with ForbiddenError', () => {
    const middleware = requireRole('admin');
    const req = makeMockReq({ user: undefined });

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

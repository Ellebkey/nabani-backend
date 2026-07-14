jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('@config/config', () => ({
  __esModule: true,
  default: { env: 'test' },
}));

import { Request, Response, NextFunction } from 'express';
import { converterErr, errorMiddleware, notFound } from '@errors/middleware';
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '@errors/app-error';

function makeMockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request;
}

function makeMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

describe('error middleware', () => {
  const next: NextFunction = jest.fn();

  // ─── converterErr (normalizeError) ────────────────────────────────

  describe('converterErr', () => {
    it('When AppError is passed, preserves it unchanged', () => {
      const res = makeMockRes();
      const error = new NotFoundError('Item', 1);

      converterErr(error, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
        }),
      );
    });

    it('When SequelizeUniqueConstraintError is passed, converts to ConflictError', () => {
      const res = makeMockRes();
      const seqError = {
        name: 'SequelizeUniqueConstraintError',
        message: 'Unique constraint',
        errors: [{ path: 'email', value: 'test@test.com', message: 'must be unique' }],
      };

      converterErr(seqError, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('When SequelizeValidationError is passed, converts to ValidationError', () => {
      const res = makeMockRes();
      const seqError = {
        name: 'SequelizeValidationError',
        message: 'Validation error',
        errors: [{ path: 'name', value: '', message: 'cannot be empty' }],
      };

      converterErr(seqError, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('When SequelizeForeignKeyConstraintError is passed, converts to ConflictError', () => {
      const res = makeMockRes();
      const seqError = {
        name: 'SequelizeForeignKeyConstraintError',
        message: 'FK error',
        fields: ['user_id'],
      };

      converterErr(seqError, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('When unknown Sequelize error is passed, converts to InternalServerError', () => {
      const res = makeMockRes();
      const seqError = {
        name: 'SequelizeDatabaseError',
        message: 'Some DB error',
      };

      converterErr(seqError, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('When generic Error is passed, converts to InternalServerError', () => {
      const res = makeMockRes();
      const error = new Error('Something went wrong');

      converterErr(error, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── errorMiddleware ──────────────────────────────────────────────

  describe('errorMiddleware', () => {
    it('When called with AppError, sends correct status and JSON response', () => {
      const res = makeMockRes();
      const error = new ValidationError('Bad input', [{ field: 'name', message: 'required' }]);

      errorMiddleware(error, makeMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Bad input',
            status: 400,
          }),
        }),
      );
    });

    it('When error has details, includes them in response', () => {
      const res = makeMockRes();
      const details = [{ field: 'email', message: 'invalid' }];
      const error = new ValidationError('Validation failed', details);

      errorMiddleware(error, makeMockReq(), res, next);

      const responseArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseArg.error.details).toBeDefined();
    });

    it('When error has context, includes it in response', () => {
      const res = makeMockRes();
      const error = new AppError('TEST', 'test', 400, { extra: 'info' });

      errorMiddleware(error, makeMockReq(), res, next);

      const responseArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseArg.error.details).toEqual({ extra: 'info' });
    });
  });

  // ─── notFound ─────────────────────────────────────────────────────

  describe('notFound', () => {
    it('When called, sends 404 with method and path info', () => {
      const res = makeMockRes();
      const req = makeMockReq({ method: 'POST', path: '/api/unknown' });

      notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'ROUTE_NOT_FOUND',
            status: 404,
          }),
        }),
      );
    });
  });
});

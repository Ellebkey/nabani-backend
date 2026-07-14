import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { getRequestContext } from '@config/request-context';
import envConfig from '@config/config';
import {
  AppError,
  InternalServerError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from './app-error';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    details?: unknown;
    stack?: string;
  };
}

interface SequelizeError extends Error {
  name: string;
  errors?: Array<{
    path: string;
    value: string;
    message: string;
  }>;
  fields?: string[];
}

function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  // Handle Sequelize errors
  const sequelizeErr = err as SequelizeError;
  if (sequelizeErr.name?.includes('Sequelize')) {
    switch (sequelizeErr.name) {
      case 'SequelizeUniqueConstraintError': {
        const field = sequelizeErr.errors?.[0]?.path || 'field';
        const value = sequelizeErr.errors?.[0]?.value || 'value';
        return new ConflictError(`A record with ${field} '${value}' already exists`);
      }
      case 'SequelizeValidationError': {
        const errors = sequelizeErr.errors?.map((e) => ({
          field: e.path,
          message: e.message,
        })) || [];
        return new ValidationError('Validation failed', errors);
      }
      case 'SequelizeForeignKeyConstraintError': {
        const constraint = sequelizeErr.fields?.[0] || 'foreign key';
        return new ConflictError(`Cannot perform operation due to ${constraint} constraint`);
      }
      default:
        return new InternalServerError('A database error occurred');
    }
  }

  // Handle validation errors from validation.util.ts
  const validationErr = err as { name?: string; errors?: unknown };
  if (validationErr.name === 'ValidationError' && validationErr.errors) {
    return new ValidationError('Validation failed', validationErr.errors);
  }

  // Handle multer upload errors (file too large, wrong type) as bad requests
  const uploadErr = err as { name?: string; message?: string };
  if (uploadErr.name === 'MulterError' || uploadErr.message === 'Only image files are allowed') {
    return new BadRequestError(uploadErr.message || 'Invalid file upload');
  }

  // Generic error fallback
  const genericErr = err as { message?: string; statusCode?: number; status?: number };
  return new InternalServerError(
    genericErr.message || 'An unexpected error occurred',
  );
}

export function converterErr(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const normalizedError = normalizeError(err);
  return errorMiddleware(normalizedError, req, res, next);
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const response: ErrorResponse = {
    error: {
      code: err.code,
      message: err.message,
      status: err.statusCode,
    },
  };

  // Correlate the client-facing error with its server-side log trace
  const requestId = getRequestContext()?.requestId;
  if (requestId) {
    response.error.requestId = requestId;
  }

  // Add details if present (e.g., validation errors)
  const errorWithDetails = err as AppError & { errors?: unknown };
  if (errorWithDetails.errors || err.context) {
    response.error.details = errorWithDetails.errors || err.context;
  }

  // Include stack trace in development
  if (envConfig.env === 'development') {
    response.error.stack = err.stack;
  }

  // Log with a severity that matches the outcome so routine client errors don't
  // flood the error stream:
  //   5xx                 -> error (real server fault; keep the stack)
  //   404 route-not-found -> debug (bots/monitors/probes hitting unknown paths;
  //                                 suppressed in production, visible in dev)
  //   other 4xx           -> warn  (expected client errors: 400/401/403/409/422)
  // A single plain-object meta is passed (never the Error itself): this avoids
  // winston's "message duplicated" behaviour and keeps the structured fields.
  const { status } = response.error;
  let level: 'error' | 'warn' | 'debug';
  if (status >= 500) {
    level = 'error';
  } else if (err.code === 'ROUTE_NOT_FOUND') {
    level = 'debug';
  } else {
    level = 'warn';
  }

  logger.log(level, err.message, {
    code: response.error.code,
    status,
    path: req.path,
    method: req.method,
    ...(response.error.details ? { details: response.error.details } : {}),
    ...(level === 'error' ? { stack: err.stack } : {}),
  });

  res.status(response.error.status).json(response);
}

export function notFound(req: Request, res: Response, next: NextFunction): void {
  const err = new AppError(
    'ROUTE_NOT_FOUND',
    `Cannot ${req.method} ${req.path}`,
    404,
  );
  return errorMiddleware(err, req, res, next);
}

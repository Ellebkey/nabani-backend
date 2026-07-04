export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get tag(): string {
    return this.code;
  }

  get status(): number {
    return this.statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string | number) {
    super('NOT_FOUND', `${resource} with identifier ${identifier} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: unknown) {
    super('VALIDATION_ERROR', message, 400, { errors });
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super('BAD_REQUEST', message, 400);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super('BUSINESS_RULE_VIOLATION', message, 422);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An internal server error occurred') {
    super('INTERNAL_ERROR', message, 500);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super('SERVICE_UNAVAILABLE', message, 503);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
  }
}

export class DatabaseConstraintError extends AppError {
  constructor(constraint: string, details?: string) {
    const message = details
      ? `Database constraint ${constraint} violated: ${details}`
      : `Database constraint ${constraint} violated`;
    super('DATABASE_CONSTRAINT', message, 409, { constraint, details });
  }
}

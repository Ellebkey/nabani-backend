import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
  BusinessRuleError,
  InternalServerError,
  ForbiddenError,
  DatabaseConstraintError,
} from '@errors/app-error';

describe('AppError classes', () => {
  it('NotFoundError has status 404 and correct message', () => {
    const error = new NotFoundError('User', 123);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
    expect(error).toBeInstanceOf(AppError);
  });

  it('ConflictError has status 409', () => {
    const error = new ConflictError('Duplicate entry');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Duplicate entry');
    expect(error).toBeInstanceOf(AppError);
  });

  it('ValidationError has status 400 and carries error details', () => {
    const details = [{ field: 'email', message: 'invalid' }];
    const error = new ValidationError('Validation failed', details);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors).toEqual(details);
    expect(error).toBeInstanceOf(AppError);
  });

  it('BadRequestError has status 400', () => {
    const error = new BadRequestError('Bad input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error).toBeInstanceOf(AppError);
  });

  it('BusinessRuleError has status 422', () => {
    const error = new BusinessRuleError('Cannot delete active item');
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(error).toBeInstanceOf(AppError);
  });

  it('InternalServerError has status 500 with default message', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toContain('internal server error');
    expect(error).toBeInstanceOf(AppError);
  });

  it('ForbiddenError has status 403', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error).toBeInstanceOf(AppError);
  });

  it('DatabaseConstraintError has status 409 and carries constraint info', () => {
    const error = new DatabaseConstraintError('fk_user_id', 'referenced row not found');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DATABASE_CONSTRAINT');
    expect(error.message).toContain('fk_user_id');
    expect(error.context).toEqual({
      constraint: 'fk_user_id',
      details: 'referenced row not found',
    });
    expect(error).toBeInstanceOf(AppError);
  });

  it('DatabaseConstraintError works without details', () => {
    const error = new DatabaseConstraintError('unique_email');
    expect(error.message).toContain('unique_email');
    expect(error.context?.details).toBeUndefined();
  });

  it('AppError tag getter returns code', () => {
    const error = new AppError('TEST_CODE', 'test message', 418);
    expect(error.tag).toBe('TEST_CODE');
  });

  it('AppError status getter returns statusCode', () => {
    const error = new AppError('TEST', 'test', 418);
    expect(error.status).toBe(418);
  });
});

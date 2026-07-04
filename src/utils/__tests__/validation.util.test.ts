import Joi from 'joi';
import { registerSchema, registerSchemas, validateDto } from '@utils/validation.util';
import { ValidationError } from '@errors/app-error';

describe('validation.util', () => {
  // ─── registerSchema ───────────────────────────────────────────────

  describe('registerSchema', () => {
    it('When registering a schema, it becomes available for validateDto', () => {
      const schema = Joi.object({ name: Joi.string().required() });
      registerSchema('test-register-1', schema);

      const result = validateDto<{ name: string }>('test-register-1', { name: 'hello' });
      expect(result).toEqual({ name: 'hello' });
    });
  });

  // ─── registerSchemas ──────────────────────────────────────────────

  describe('registerSchemas', () => {
    it('When registering multiple schemas, all become available', () => {
      const schemas = {
        'test-multi-a': Joi.object({ a: Joi.string().required() }),
        'test-multi-b': Joi.object({ b: Joi.number().required() }),
      };
      registerSchemas(schemas);

      expect(validateDto<{ a: string }>('test-multi-a', { a: 'value' })).toEqual({ a: 'value' });
      expect(validateDto<{ b: number }>('test-multi-b', { b: 42 })).toEqual({ b: 42 });
    });
  });

  // ─── validateDto ──────────────────────────────────────────────────

  describe('validateDto', () => {
    beforeAll(() => {
      registerSchema('test-user', Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(0),
        email: Joi.string().email(),
      }));
    });

    it('When data is valid, returns validated data', () => {
      const result = validateDto<{ name: string }>('test-user', { name: 'John', age: 25 });
      expect(result).toEqual({ name: 'John', age: 25 });
    });

    it('When required field is missing, throws ValidationError', () => {
      expect(() => validateDto('test-user', { age: 25 })).toThrow(ValidationError);
    });

    it('When field has invalid type, throws ValidationError', () => {
      expect(() => validateDto('test-user', { name: 'John', age: 'not-a-number' }))
        .toThrow(ValidationError);
    });

    it('When validation fails, error contains field details', () => {
      try {
        validateDto('test-user', {});
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
          ]),
        );
      }
    });

    it('When schema not found, throws generic Error', () => {
      expect(() => validateDto('nonexistent-schema', {}))
        .toThrow('Schema \'nonexistent-schema\' not found in registry');
    });

    it('When unknown fields are present, strips them (stripUnknown: true)', () => {
      const result = validateDto<{ name: string }>('test-user', {
        name: 'John',
        unknownField: 'should be removed',
      });
      expect(result).toEqual({ name: 'John' });
      expect((result as Record<string, unknown>).unknownField).toBeUndefined();
    });

    it('When types are convertible, converts them (convert: true)', () => {
      const result = validateDto<{ name: string; age: number }>('test-user', {
        name: 'John',
        age: '25',
      });
      expect(result).toEqual({ name: 'John', age: 25 });
      expect(typeof result.age).toBe('number');
    });

    it('When multiple fields fail, collects all errors (abortEarly: false)', () => {
      try {
        validateDto('test-user', { age: -1, email: 'invalid' });
        fail('Should have thrown');
      } catch (error) {
        const validationError = error as ValidationError;
        const errors = validationError.errors as Array<{ field: string }>;
        expect(errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

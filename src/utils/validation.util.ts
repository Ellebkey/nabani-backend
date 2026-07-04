import Joi from 'joi';
import { ValidationError } from '@errors/app-error';

// Schema registry to store all validation schemas
const schemaRegistry: Record<string, Joi.Schema> = {};

/**
 * Register a validation schema
 * @param name - Name of the schema
 * @param schema - Joi schema to register
 */
export function registerSchema(name: string, schema: Joi.Schema): void {
  schemaRegistry[name] = schema;
}

/**
 * Register multiple validation schemas
 * @param schemas - Object containing schema names as keys and Joi schemas as values
 */
export function registerSchemas(schemas: Record<string, Joi.Schema>): void {
  Object.entries(schemas).forEach(([name, schema]) => {
    registerSchema(name, schema);
  });
}

/**
 * Validate DTO against schema
 * @param schemaName - Name of the schema to validate against
 * @param data - Data to validate
 * @returns Validated and sanitized data
 * @throws ValidationError if validation fails
 */
export function validateDto<T>(schemaName: string, data: unknown): T {
  const schema = schemaRegistry[schemaName];

  if (!schema) {
    throw new Error(`Schema '${schemaName}' not found in registry`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw new ValidationError('Validation failed', errors);
  }

  return value as T;
}

// ValidationError is now imported from the unified error module above

import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const userValidationSchemas = {
  createUser: Joi.object({
    username: Joi.string()
      .required()
      .min(3)
      .max(50)
      .trim()
      .alphanum()
      .message('Username must be alphanumeric'),
    password: Joi.string()
      .required()
      .min(6)
      .max(100),
    email: Joi.string()
      .required()
      .email()
      .max(255)
      .trim()
      .lowercase(),
    mobileNumber: Joi.string()
      .max(20)
      .trim()
      .allow(''),
    roles: Joi.array()
      .items(Joi.string())
      .default(['user']),
  }),

  updateUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .alphanum()
      .message('Username must be alphanumeric'),
    fullname: Joi.string()
      .allow(null, '')
      .max(100)
      .trim(),
    email: Joi.string()
      .email()
      .max(255)
      .trim()
      .lowercase(),
    mobileNumber: Joi.string()
      .max(20)
      .trim(),
    roles: Joi.array()
      .items(Joi.string()),
  }).min(1), // At least one field required

  loginUser: Joi.object({
    usernameOrEmail: Joi.string()
      .required()
      .trim(),
    password: Joi.string()
      .required(),
  }),

  userFilter: Joi.object({
    searchText: Joi.string()
      .allow('')
      .max(100)
      .trim(),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0),
    limit: Joi.number()
      .integer()
      .min(1)
      .default(50),
    role: Joi.string()
      .trim(),
  }),

  setDefaultAccount: Joi.object({
    accountId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'accountId must be a valid UUID',
        'any.required': 'accountId is required',
      }),
  }),

  userConfig: Joi.object({
    defaultAccount: Joi.string()
      .trim()
      .allow(''),
  }),
};

// Register user validation schemas
registerSchemas(userValidationSchemas);

export default userValidationSchemas;

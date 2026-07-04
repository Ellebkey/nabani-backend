import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const POSITIONS = ['nutriologa', 'admin', 'cocina', 'front_desk', 'reparto'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const employeeValidationSchemas = {
  createEmployee: Joi.object({
    firstName: Joi.string().required().min(1).max(80)
      .trim(),
    lastName: Joi.string().required().min(1).max(80)
      .trim(),
    email: Joi.string().required().email().max(120)
      .trim(),
    position: Joi.string().required().valid(...POSITIONS),
    salaryQuincenal: Joi.number().required().min(0),
    lastPaymentDate: Joi.string().pattern(DATE_ONLY).allow(null),
    userId: Joi.string().uuid().allow(null),
    active: Joi.boolean(),
  }).unknown(false),

  updateEmployee: Joi.object({
    firstName: Joi.string().min(1).max(80).trim(),
    lastName: Joi.string().min(1).max(80).trim(),
    email: Joi.string().email().max(120).trim(),
    position: Joi.string().valid(...POSITIONS),
    salaryQuincenal: Joi.number().min(0),
    lastPaymentDate: Joi.string().pattern(DATE_ONLY).allow(null),
    userId: Joi.string().uuid().allow(null),
    active: Joi.boolean(),
  }).min(1),

  employeeFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    position: Joi.string().valid(...POSITIONS),
    active: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(employeeValidationSchemas);

export default employeeValidationSchemas;

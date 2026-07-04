import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const EXPENSE_TYPES = ['fijo', 'variable', 'nomina'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const expenseValidationSchemas = {
  createExpense: Joi.object({
    folio: Joi.string().max(40).trim().allow('', null),
    // Vendor name (auto-created/matched) — required unless it is a nómina expense.
    beneficiary: Joi.string().max(120).trim().when('type', {
      is: 'nomina',
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    concept: Joi.string().required().min(1).max(200)
      .trim(),
    totalAmount: Joi.number().required().min(0),
    expenseDate: Joi.string().required().pattern(DATE_ONLY),
    type: Joi.string().required().valid(...EXPENSE_TYPES),
    // Employee to pay — required for nómina expenses.
    employeeId: Joi.string().uuid().when('type', {
      is: 'nomina',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    }),
    comments: Joi.string().max(1000).trim().allow('', null),
  }).unknown(false),

  updateExpense: Joi.object({
    folio: Joi.string().max(40).trim().allow('', null),
    beneficiary: Joi.string().max(120).trim(),
    concept: Joi.string().min(1).max(200).trim(),
    totalAmount: Joi.number().min(0),
    expenseDate: Joi.string().pattern(DATE_ONLY),
    type: Joi.string().valid(...EXPENSE_TYPES),
    employeeId: Joi.string().uuid().allow(null),
    comments: Joi.string().max(1000).trim().allow('', null),
  }).min(1),

  expenseFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    type: Joi.string().valid(...EXPENSE_TYPES),
    beneficiaryId: Joi.string().uuid(),
    startDate: Joi.string().pattern(DATE_ONLY),
    endDate: Joi.string().pattern(DATE_ONLY),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(expenseValidationSchemas);

export default expenseValidationSchemas;

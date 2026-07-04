import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const paymentValidationSchemas = {
  updatePayment: Joi.object({
    paid: Joi.boolean(),
    method: Joi.string().valid(...PAYMENT_METHODS).allow(null),
    amount: Joi.number().min(0),
    dueDate: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'dueDate must be a date in YYYY-MM-DD format' }),
    note: Joi.string().max(1000).trim().allow('', null),
  }).min(1),

  paymentFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    patientId: Joi.string().uuid(),
    saleId: Joi.string().uuid(),
    paid: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(paymentValidationSchemas);

export default paymentValidationSchemas;

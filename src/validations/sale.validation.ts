import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const SALE_TYPES = ['package', 'consulta'];
const BILLINGS = ['mensual', 'quincenal', 'semanal', 'diario'];
const SALE_STATUSES = ['pendiente', 'pagada'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const saleItem = Joi.object({
  packageId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
  subTotal: Joi.number().min(0),
});

const saleValidationSchemas = {
  createSale: Joi.object({
    folio: Joi.string().max(40).trim().allow(null, ''),
    patientId: Joi.string().uuid().required(),
    packageId: Joi.string().uuid().allow(null),
    type: Joi.string().required().valid(...SALE_TYPES),
    totalAmount: Joi.number().required().min(0),
    startDate: Joi.string().pattern(DATE_ONLY).required()
      .messages({ 'string.pattern.base': 'startDate must be a date in YYYY-MM-DD format' }),
    days: Joi.number().integer().min(0).required(),
    billing: Joi.string().required().valid(...BILLINGS),
    discount: Joi.number().min(0).default(0),
    paymentType: Joi.string().max(30).trim().allow(null, ''),
    invoiceRequested: Joi.boolean().default(false),
    status: Joi.string().valid(...SALE_STATUSES).default('pendiente'),
    items: Joi.array().items(saleItem).default([]),
  }).unknown(false),

  saleFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    patientId: Joi.string().uuid(),
    status: Joi.string().valid(...SALE_STATUSES),
    type: Joi.string().valid(...SALE_TYPES),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(saleValidationSchemas);

export default saleValidationSchemas;

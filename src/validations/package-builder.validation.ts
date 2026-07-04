import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const BILLINGS = ['mensual', 'quincenal', 'semanal', 'diario'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateOnly = Joi.string().pattern(DATE_ONLY)
  .messages({ 'string.pattern.base': 'must be a date in YYYY-MM-DD format' });

const packageBuilderValidationSchemas = {
  calculatePackageDays: Joi.object({
    patientId: Joi.string().uuid().required(),
    packageId: Joi.string().uuid().required(),
    startDate: dateOnly.required(),
    days: Joi.number().integer().min(1).max(400)
      .required(),
    billing: Joi.string().required().valid(...BILLINGS),
    paymentType: Joi.string().max(30).trim().allow(null, ''),
    ignoreMonthlyDiscount: Joi.boolean().default(false),
    coupleDiscount: Joi.boolean().default(false),
    especialDiscount: Joi.boolean().default(false),
    invoiceRequested: Joi.boolean().default(false),
    folio: Joi.string().max(40).trim().allow(null, ''),
  }).unknown(false),

  changeSaleAmount: Joi.object({
    saleId: Joi.string().uuid().required(),
    totalAmount: Joi.number().min(0).required(),
  }).unknown(false),

  cancelDelivery: Joi.object({
    deliveryDayId: Joi.string().uuid().required(),
  }).unknown(false),
};

registerSchemas(packageBuilderValidationSchemas);

export default packageBuilderValidationSchemas;

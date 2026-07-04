import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const DELIVERY_TYPES = ['package', 'consulta'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const deliveryValidationSchemas = {
  updateDeliveryDay: Joi.object({
    deliveryDate: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'deliveryDate must be a date in YYYY-MM-DD format' }),
    amount: Joi.number().min(0),
    type: Joi.string().valid(...DELIVERY_TYPES),
    menuDayId: Joi.string().uuid().allow(null),
    hasMenu: Joi.boolean(),
    authorized: Joi.boolean(),
    status: Joi.string().max(20).trim().allow('', null),
  }).min(1),

  deliveryDayFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    patientId: Joi.string().uuid(),
    date: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'date must be a date in YYYY-MM-DD format' }),
    authorized: Joi.boolean(),
    type: Joi.string().valid(...DELIVERY_TYPES),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),

  deliveryPatientParam: Joi.object({
    patientId: Joi.string().uuid().required(),
  }),
};

registerSchemas(deliveryValidationSchemas);

export default deliveryValidationSchemas;

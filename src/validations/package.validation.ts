import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const packageValidationSchemas = {
  createPackage: Joi.object({
    displayLabel: Joi.string().required().min(1).max(80)
      .trim(),
    code: Joi.string().required().min(1).max(40)
      .trim(),
    pricePerDay: Joi.number().required().min(0),
    consultPrice: Joi.number().min(0).allow(null),
    monthDiscount: Joi.number().integer().min(0).default(0),
    coupleDiscount: Joi.number().integer().min(0).default(0),
    especialDiscount: Joi.number().integer().min(0).default(0),
    includesDesayuno: Joi.boolean().default(false),
    includesSnack1: Joi.boolean().default(false),
    includesComida: Joi.boolean().default(false),
    includesSnack2: Joi.boolean().default(false),
    includesCena: Joi.boolean().default(false),
  }).unknown(false),

  updatePackage: Joi.object({
    displayLabel: Joi.string().min(1).max(80).trim(),
    code: Joi.string().min(1).max(40).trim(),
    pricePerDay: Joi.number().min(0),
    consultPrice: Joi.number().min(0).allow(null),
    monthDiscount: Joi.number().integer().min(0),
    coupleDiscount: Joi.number().integer().min(0),
    especialDiscount: Joi.number().integer().min(0),
    includesDesayuno: Joi.boolean(),
    includesSnack1: Joi.boolean(),
    includesComida: Joi.boolean(),
    includesSnack2: Joi.boolean(),
    includesCena: Joi.boolean(),
    active: Joi.boolean(),
  }).min(1),

  packageFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    active: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(packageValidationSchemas);

export default packageValidationSchemas;

import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const FOOD_GROUPS = ['verdura', 'fruta', 'cereal', 'lacteo', 'condimento', 'otros'];
const UNITS = ['gr', 'ml', 'pzas'];

const ingredientValidationSchemas = {
  createIngredient: Joi.object({
    name: Joi.string().required().min(1).max(80)
      .trim(),
    foodGroup: Joi.string().required().valid(...FOOD_GROUPS),
    baseUnit: Joi.string().required().valid(...UNITS),
    baseQuantity: Joi.number().required().min(0),
    lastPrice: Joi.number().min(0).allow(null),
    diseaseIds: Joi.array().items(Joi.string().uuid()).default([]),
  }).unknown(false),

  updateIngredient: Joi.object({
    name: Joi.string().min(1).max(80).trim(),
    foodGroup: Joi.string().valid(...FOOD_GROUPS),
    baseUnit: Joi.string().valid(...UNITS),
    baseQuantity: Joi.number().min(0),
    lastPrice: Joi.number().min(0).allow(null),
    active: Joi.boolean(),
    diseaseIds: Joi.array().items(Joi.string().uuid()),
  }).min(1),

  ingredientFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    foodGroup: Joi.string().valid(...FOOD_GROUPS),
    diseaseId: Joi.string().uuid(),
    active: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(ingredientValidationSchemas);

export default ingredientValidationSchemas;

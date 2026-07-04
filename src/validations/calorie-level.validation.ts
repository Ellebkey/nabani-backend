import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const calorieLevelValidationSchemas = {
  createCalorieLevel: Joi.object({
    kcal: Joi.number().integer().required().min(500)
      .max(6000),
    label: Joi.string().required().min(1).max(20)
      .trim(),
    sortOrder: Joi.number().integer().min(0).default(0),
  }).unknown(false),

  updateCalorieLevel: Joi.object({
    kcal: Joi.number().integer().min(500).max(6000),
    label: Joi.string().min(1).max(20).trim(),
    sortOrder: Joi.number().integer().min(0),
    active: Joi.boolean(),
  }).min(1),
};

registerSchemas(calorieLevelValidationSchemas);

export default calorieLevelValidationSchemas;

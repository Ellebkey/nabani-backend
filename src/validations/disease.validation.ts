import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const diseaseValidationSchemas = {
  createDisease: Joi.object({
    key: Joi.string().required().min(1).max(40)
      .trim(),
    name: Joi.string().required().min(1).max(80)
      .trim(),
  }).unknown(false),

  updateDisease: Joi.object({
    key: Joi.string().min(1).max(40).trim(),
    name: Joi.string().min(1).max(80).trim(),
  }).min(1),
};

registerSchemas(diseaseValidationSchemas);

export default diseaseValidationSchemas;

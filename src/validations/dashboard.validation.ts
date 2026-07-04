import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dashboardValidationSchemas = {
  dashboardQuery: Joi.object({
    date: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'date must be in YYYY-MM-DD format' }),
  }),
};

registerSchemas(dashboardValidationSchemas);

export default dashboardValidationSchemas;

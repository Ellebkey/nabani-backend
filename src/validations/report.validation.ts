import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateOnly = Joi.string().pattern(DATE_ONLY)
  .messages({ 'string.pattern.base': 'must be a date in YYYY-MM-DD format' });

const reportValidationSchemas = {
  reportRange: Joi.object({
    startDate: dateOnly.required(),
    endDate: dateOnly.required(),
  }),

  reportRangeOptional: Joi.object({
    startDate: dateOnly,
    endDate: dateOnly,
  }),
};

registerSchemas(reportValidationSchemas);

export default reportValidationSchemas;

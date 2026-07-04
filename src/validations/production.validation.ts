import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateOnly = Joi.string().pattern(DATE_ONLY)
  .messages({ 'string.pattern.base': 'must be a date in YYYY-MM-DD format' });

const productionValidationSchemas = {
  dateQuery: Joi.object({
    date: dateOnly.required(),
  }),

  shoppingListQuery: Joi.object({
    date: dateOnly,
    week: dateOnly,
    startDate: dateOnly,
    endDate: dateOnly,
  }).and('startDate', 'endDate'),
};

registerSchemas(productionValidationSchemas);

export default productionValidationSchemas;

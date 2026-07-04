import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateOnly = Joi.string().pattern(DATE_ONLY)
  .messages({ 'string.pattern.base': 'must be a date in YYYY-MM-DD format' });

const adjustmentValidationSchemas = {
  applyMenuBody: Joi.object({
    date: dateOnly.required(),
  }).unknown(false),

  adjustmentsQuery: Joi.object({
    date: dateOnly.required(),
    filter: Joi.string().valid('todos', 'conflictos', 'listos').default('todos'),
  }),

  deliveryDayParam: Joi.object({
    deliveryDayId: Joi.string().uuid().required(),
  }),

  swapSuggestionQuery: Joi.object({
    deliveryMealIngredientId: Joi.string().uuid().required(),
  }),

  swapBody: Joi.object({
    deliveryMealIngredientId: Joi.string().uuid().required(),
    newIngredientId: Joi.string().uuid().required(),
  }).unknown(false),

  eliminateBody: Joi.object({
    deliveryMealIngredientId: Joi.string().uuid().required(),
  }).unknown(false),

  authorizeBody: Joi.object({
    deliveryDayIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }).unknown(false),
};

registerSchemas(adjustmentValidationSchemas);

export default adjustmentValidationSchemas;

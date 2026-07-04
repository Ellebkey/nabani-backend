import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const MEAL_SLOTS = ['desayuno', 'colacion1', 'comida', 'colacion2', 'cena'];
const STATUSES = ['borrador', 'sin_porciones', 'completo'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const menuDayMeal = Joi.object({
  mealSlot: Joi.string().required().valid(...MEAL_SLOTS),
  dishId: Joi.string().uuid().allow(null).default(null),
  position: Joi.number().integer().min(0).default(0),
});

const menuDayValidationSchemas = {
  createMenuDay: Joi.object({
    menuDate: Joi.string().pattern(DATE_ONLY).required()
      .messages({ 'string.pattern.base': 'menuDate must be a date in YYYY-MM-DD format' }),
    status: Joi.string().valid(...STATUSES).default('borrador'),
    meals: Joi.array().items(menuDayMeal).default([]),
  }).unknown(false),

  updateMenuDay: Joi.object({
    menuDate: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'menuDate must be a date in YYYY-MM-DD format' }),
    status: Joi.string().valid(...STATUSES),
    meals: Joi.array().items(menuDayMeal),
  }).min(1),

  menuDayFilter: Joi.object({
    startDate: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'startDate must be a date in YYYY-MM-DD format' }),
    endDate: Joi.string().pattern(DATE_ONLY)
      .messages({ 'string.pattern.base': 'endDate must be a date in YYYY-MM-DD format' }),
    status: Joi.string().valid(...STATUSES),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),

  menuDayDateParam: Joi.object({
    date: Joi.string().pattern(DATE_ONLY).required()
      .messages({ 'string.pattern.base': 'date must be in YYYY-MM-DD format' }),
  }),
};

registerSchemas(menuDayValidationSchemas);

export default menuDayValidationSchemas;

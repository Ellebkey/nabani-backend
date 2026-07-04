import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const MEAL_TIMES = ['desayuno', 'snack', 'comida', 'cena'];
const UNITS = ['gr', 'ml', 'pzas'];

const dishIngredientPortion = Joi.object({
  calorieLevelId: Joi.string().uuid().required(),
  portions: Joi.number().required().min(0),
});

const dishIngredient = Joi.object({
  ingredientId: Joi.string().uuid().required(),
  baseQuantity: Joi.number().required().min(0),
  unit: Joi.string().required().valid(...UNITS),
  position: Joi.number().integer().min(0).default(0),
  portions: Joi.array().items(dishIngredientPortion).default([]),
});

const dishValidationSchemas = {
  createDish: Joi.object({
    name: Joi.string().required().min(1).max(120)
      .trim(),
    mealTime: Joi.string().required().valid(...MEAL_TIMES),
    ingredients: Joi.array().items(dishIngredient).default([]),
  }).unknown(false),

  updateDish: Joi.object({
    name: Joi.string().min(1).max(120).trim(),
    mealTime: Joi.string().valid(...MEAL_TIMES),
    active: Joi.boolean(),
    ingredients: Joi.array().items(dishIngredient),
  }).min(1),

  dishFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    mealTime: Joi.string().valid(...MEAL_TIMES),
    active: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(dishValidationSchemas);

export default dishValidationSchemas;

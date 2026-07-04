import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const WEEKS = ['LD', 'LV', 'LS'];
const STATUSES = ['activo', 'inactivo'];

const dateOnly = () => Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const uuidArray = () => Joi.array().items(Joi.string().uuid());

const addressSchema = Joi.object({
  street: Joi.string().max(120).allow('', null),
  numberExt: Joi.string().max(20).allow('', null),
  numberInt: Joi.string().max(20).allow('', null),
  neighborhood: Joi.string().max(120).allow('', null),
  zipCode: Joi.string().max(10).allow('', null),
  city: Joi.string().max(80).allow('', null),
  state: Joi.string().max(80).allow('', null),
}).unknown(false);

const nutritionPlanSchema = Joi.object({
  calorieLevelId: Joi.string().uuid().allow(null),
  verduras: Joi.number().integer().min(0).allow(null),
  frutas: Joi.number().integer().min(0).allow(null),
  cereales: Joi.number().integer().min(0).allow(null),
  lacteos: Joi.number().integer().min(0).allow(null),
  pDesayuno: Joi.number().integer().min(0).allow(null),
  pComida: Joi.number().integer().min(0).allow(null),
  pCena: Joi.number().integer().min(0).allow(null),
  aceites: Joi.number().integer().min(0).allow(null),
  semillas: Joi.number().integer().min(0).allow(null),
  comments: Joi.string().allow('', null),
}).unknown(false);

const patientValidationSchemas = {
  createPatient: Joi.object({
    firstName: Joi.string().required().min(1).max(80)
      .trim(),
    lastName: Joi.string().required().min(1).max(80)
      .trim(),
    email: Joi.string().email().max(120).allow('', null),
    cellphone: Joi.string().max(20).allow('', null),
    gender: Joi.string().max(20).allow('', null),
    birthday: dateOnly().allow(null),
    week: Joi.string().valid(...WEEKS).allow(null),
    zone: Joi.string().max(80).allow('', null),
    tuppers: Joi.boolean().default(false),
    otherFood: Joi.string().allow('', null),
    otherDiseases: Joi.string().allow('', null),
    otherPreferences: Joi.string().allow('', null),
    calorieLevelId: Joi.string().uuid().allow(null),
    nutriologaId: Joi.string().uuid().allow(null),
    address: addressSchema.allow(null),
    nutritionPlan: nutritionPlanSchema.allow(null),
    diseaseIds: uuidArray().default([]),
    preferenceIngredientIds: uuidArray().default([]),
  }).unknown(false),

  updatePatient: Joi.object({
    firstName: Joi.string().min(1).max(80).trim(),
    lastName: Joi.string().min(1).max(80).trim(),
    email: Joi.string().email().max(120).allow('', null),
    cellphone: Joi.string().max(20).allow('', null),
    gender: Joi.string().max(20).allow('', null),
    birthday: dateOnly().allow(null),
    week: Joi.string().valid(...WEEKS).allow(null),
    zone: Joi.string().max(80).allow('', null),
    tuppers: Joi.boolean(),
    otherFood: Joi.string().allow('', null),
    otherDiseases: Joi.string().allow('', null),
    otherPreferences: Joi.string().allow('', null),
    calorieLevelId: Joi.string().uuid().allow(null),
    nutriologaId: Joi.string().uuid().allow(null),
    address: addressSchema.allow(null),
    nutritionPlan: nutritionPlanSchema.allow(null),
    diseaseIds: uuidArray(),
    preferenceIngredientIds: uuidArray(),
  }).min(1),

  updatePatientStatus: Joi.object({
    status: Joi.string().required().valid(...STATUSES),
  }).unknown(false),

  patientFilter: Joi.object({
    searchText: Joi.string().allow('').trim(),
    status: Joi.string().valid(...STATUSES),
    porVencer: Joi.boolean(),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(200)
      .default(50),
  }),
};

registerSchemas(patientValidationSchemas);

export default patientValidationSchemas;

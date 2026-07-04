import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const TYPES = ['inicial', 'seguimiento'];

const dateOnly = () => Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const measure = () => Joi.number().min(0).allow(null);
const intMeasure = () => Joi.number().integer().min(0).allow(null);

const consultationValidationSchemas = {
  patientIdParam: Joi.object({
    patientId: Joi.string().uuid().required(),
  }),

  createConsultation: Joi.object({
    consultDate: dateOnly().required(),
    price: Joi.number().min(0).default(0),
    type: Joi.string().required().valid(...TYPES),
    weight: measure(),
    bodyFat: measure(),
    muscle: measure(),
    water: measure(),
    arm: measure(),
    waist: measure(),
    abdomen: measure(),
    hip: measure(),
    height: measure(),
    age: intMeasure(),
    objetivoKcal: intMeasure(),
    notes: Joi.string().allow('', null),
    nutriologaId: Joi.string().uuid().allow(null),
  }).unknown(false),

  updateConsultation: Joi.object({
    consultDate: dateOnly(),
    price: Joi.number().min(0),
    type: Joi.string().valid(...TYPES),
    weight: measure(),
    bodyFat: measure(),
    muscle: measure(),
    water: measure(),
    arm: measure(),
    waist: measure(),
    abdomen: measure(),
    hip: measure(),
    height: measure(),
    age: intMeasure(),
    objetivoKcal: intMeasure(),
    notes: Joi.string().allow('', null),
    nutriologaId: Joi.string().uuid().allow(null),
  }).min(1),
};

registerSchemas(consultationValidationSchemas);

export default consultationValidationSchemas;

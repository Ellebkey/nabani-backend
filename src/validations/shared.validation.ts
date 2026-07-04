import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const sharedValidationSchemas = {
  entityId: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required(),
  }),

  entityUuid: Joi.object({
    id: Joi.string()
      .uuid()
      .required(),
  }),
};

registerSchemas(sharedValidationSchemas);

export default sharedValidationSchemas;

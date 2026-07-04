import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nabani API',
      version: '1.0.0',
      description: 'REST API for Nabani — nutrition-clinic + meal-prep operations '
        + '(patients, menus, production, sales, payments, catalogs).',
      contact: {
        name: 'Joel Barranco',
        email: 'hello@joelbarranco.io',
      },
    },
    servers: [
      {
        url: 'http://localhost:4040/api',
        description: 'Development server',
      },
    ],
  },
  apis: [
    './src/docs/schemas/*.ts',
    './src/docs/paths/*.ts',
    './src/docs/components/*.ts',
  ],
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MyExpenses API Documentation',
  }));
};

export default specs;

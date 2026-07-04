import { resolve } from 'path';
import joi from 'joi';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  SQL_HOST: string;
  SQL_DB: string;
  SQL_USER: string;
  SQL_PASSWORD: string;
  SQL_PORT: number;
}

const envVarsSchema = joi.object({
  NODE_ENV: joi.string()
    .valid('development', 'production', 'stage', 'test')
    .default('development'),
  PORT: joi.number()
    .default(4040),
  JWT_SECRET: joi.string().required()
    .description('JWT Secret required to sign'),
  FRONTEND_URL: joi.string()
    .default('http://localhost:4200')
    .description('Allowed CORS origin for the frontend'),
  RESEND_API_KEY: joi.string()
    .allow('')
    .default('')
    .description('Resend API key for transactional emails (email no-ops when empty)'),
  RESEND_FROM_EMAIL: joi.string().email()
    .default('noreply@nabani.app')
    .description('Sender email address for outgoing emails'),
  SQL_HOST: joi.string().required()
    .description('SQL DB host url'),
  SQL_DB: joi.string().required()
    .description('SQL DB name'),
  SQL_USER: joi.string().required()
    .description('SQL DB user'),
  SQL_PASSWORD: joi.string().required()
    .description('SQL DB password'),
  SQL_PORT: joi.number()
    .default(5432),
}).unknown().required();

const { error, value: envVars } = envVarsSchema.validate(process.env) as { error: Error | undefined; value: EnvVars };

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envConfig = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET,
  frontendUrl: envVars.FRONTEND_URL,
  resend: {
    apiKey: envVars.RESEND_API_KEY,
    fromEmail: envVars.RESEND_FROM_EMAIL,
  },
  sql: {
    host: envVars.SQL_HOST,
    port: envVars.SQL_PORT,
    user: envVars.SQL_USER,
    password: envVars.SQL_PASSWORD,
    db: envVars.SQL_DB,
  },
  MAX_POOL: 10,
  MIN_POOL: 1,
};

export default envConfig;

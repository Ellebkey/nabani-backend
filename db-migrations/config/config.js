// sequelize-cli config — reads from env (no committed credentials).
// Loaded by .sequelizerc for db:migrate / db:seed.
require('dotenv').config();

const common = {
  dialect: 'postgres',
  username: process.env.SQL_USER || 'postgres',
  password: process.env.SQL_PASSWORD || 'postgres',
  host: process.env.SQL_HOST || '127.0.0.1',
  port: Number(process.env.SQL_PORT) || 5432,
};

module.exports = {
  development: { ...common, database: process.env.SQL_DB || 'nabani' },
  test: { ...common, database: process.env.SQL_DB || 'nabani_test' },
  production: {
    ...common,
    database: process.env.SQL_DB || 'nabani',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  },
};

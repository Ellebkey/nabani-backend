'use strict';

/**
 * uuid-ossp — required before sequelize.sync() creates any table: every model's
 * PK default is uuid_generate_v4(). Runs on the first prod deploy (empty DB).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
  },
};

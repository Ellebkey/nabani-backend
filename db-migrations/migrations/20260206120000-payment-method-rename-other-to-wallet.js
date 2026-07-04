'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE payment_method SET method = 'wallet' WHERE method = 'other'`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE payment_method SET method = 'other' WHERE method = 'wallet'`
    );
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user', 'email_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Mark existing users as verified so they are not locked out
    await queryInterface.sequelize.query(`
      UPDATE "user" SET email_verified = true
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user', 'email_verified');
  },
};

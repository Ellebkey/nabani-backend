'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subcategory', 'enabled_tiers', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: ['free', 'premium'],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subcategory', 'enabled_tiers');
  },
};

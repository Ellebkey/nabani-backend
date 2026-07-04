'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('package', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      display_label: { type: Sequelize.STRING(80), allowNull: false },
      code: { type: Sequelize.STRING(40), allowNull: false },
      price_per_day: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      consult_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      month_discount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      couple_discount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      especial_discount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      includes_desayuno: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      includes_snack1: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      includes_comida: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      includes_snack2: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      includes_cena: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('package');
  },
};

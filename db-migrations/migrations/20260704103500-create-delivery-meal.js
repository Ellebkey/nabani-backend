'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_meal', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      delivery_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'delivery_day', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      meal_slot: { type: Sequelize.STRING(20), allowNull: false },
      dish_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'dish', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      included: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('delivery_meal', ['delivery_day_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_meal');
  },
};

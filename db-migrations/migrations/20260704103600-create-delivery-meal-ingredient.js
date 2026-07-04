'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_meal_ingredient', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      delivery_meal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'delivery_meal', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'ingredient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      portions: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      conflict_type: { type: Sequelize.STRING(20), allowNull: true },
      substituted_from_ingredient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'ingredient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      eliminated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    await queryInterface.addIndex('delivery_meal_ingredient', ['delivery_meal_id']);
    await queryInterface.addIndex('delivery_meal_ingredient', ['ingredient_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_meal_ingredient');
  },
};

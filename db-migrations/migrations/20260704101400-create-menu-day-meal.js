'use strict';

/**
 * MenuDayMeal — one meal slot of a menú del día, optionally assigned a dish.
 * One row per (menu_day, meal_slot).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menu_day_meal', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      menu_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'menu_day', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      meal_slot: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      dish_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'dish', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('menu_day_meal', ['menu_day_id', 'meal_slot'], {
      name: 'idx_menu_day_meal_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('menu_day_meal');
  },
};

'use strict';

/**
 * DishIngredientPortion — portions of a dish ingredient at a given calorie level.
 * One row per (dish_ingredient, calorie_level).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dish_ingredient_portion', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      dish_ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dish_ingredient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      calorie_level_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'calorie_level', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portions: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('dish_ingredient_portion', ['dish_ingredient_id', 'calorie_level_id'], {
      name: 'idx_dish_ingredient_portion_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dish_ingredient_portion');
  },
};

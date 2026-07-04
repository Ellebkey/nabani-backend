'use strict';

/**
 * DishIngredient — an ingredient line within a dish (base gramaje/unit + position).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dish_ingredient', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      dish_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'dish', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'ingredient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      base_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'gr',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('dish_ingredient', ['dish_id'], {
      name: 'idx_dish_ingredient_dish',
    });

    await queryInterface.addIndex('dish_ingredient', ['ingredient_id'], {
      name: 'idx_dish_ingredient_ingredient',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dish_ingredient');
  },
};

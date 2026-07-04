'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('expense_item', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'category',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('expense_item', 'subcategory_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'subcategory',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('expense_item', ['category_id'], {
      name: 'idx_expense_item_category_id',
    });

    await queryInterface.addIndex('expense_item', ['subcategory_id'], {
      name: 'idx_expense_item_subcategory_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('expense_item', 'idx_expense_item_subcategory_id');
    await queryInterface.removeIndex('expense_item', 'idx_expense_item_category_id');
    await queryInterface.removeColumn('expense_item', 'subcategory_id');
    await queryInterface.removeColumn('expense_item', 'category_id');
  },
};

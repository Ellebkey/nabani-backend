'use strict';

/**
 * A monthly budget for a shared category within a partnership.
 * One budget per (partnership, category, period_month).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partnership_budget', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      partnership_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'partnership', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'category', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      period_month: {
        type: Sequelize.STRING(7),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('partnership_budget', ['partnership_id', 'category_id', 'period_month'], {
      name: 'idx_partnership_budget_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('partnership_budget');
  },
};

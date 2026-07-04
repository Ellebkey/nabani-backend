'use strict';

/**
 * Expense-level override that forces an expense shared or personal.
 * 'auto' defers to the shared-category resolution; the default backfills
 * every existing expense.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('expense', 'share_scope', {
      type: Sequelize.ENUM('auto', 'shared', 'personal'),
      allowNull: false,
      defaultValue: 'auto',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('expense', 'share_scope');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_expense_share_scope";');
  },
};

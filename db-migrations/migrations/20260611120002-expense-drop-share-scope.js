'use strict';

/**
 * Removes the expense-level share_scope override. Family Mode v2 resolves
 * sharing purely from partnership_excluded_category, so per-expense
 * overrides no longer exist.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('expense', 'share_scope');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_expense_share_scope";');
  },

  async down(queryInterface, Sequelize) {
    // Re-add the override column (previous values are lost; 'auto' matches v1 default)
    await queryInterface.addColumn('expense', 'share_scope', {
      type: Sequelize.ENUM('auto', 'shared', 'personal'),
      allowNull: false,
      defaultValue: 'auto',
    });
  },
};

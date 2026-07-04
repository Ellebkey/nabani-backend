'use strict';

/**
 * Adds the savings goal (objetivo) to account sections so the UI can show
 * progress toward a target amount. Nullable: sections without a goal simply
 * hold money with no progress bar.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('account_section', 'target_amount', {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('account_section', 'target_amount');
  },
};

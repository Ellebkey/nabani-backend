'use strict';

/**
 * Drops the old VARCHAR-based category columns after data has been migrated
 * to the new FK-based schema.
 *
 * IMPORTANT: Only run this AFTER running the manual-scripts/normalize-categories.sql
 * script and verifying that category_id/subcategory_id are correctly populated.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    // Verify data was migrated before dropping
    const [nullCheck] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS count FROM expense_item
      WHERE subcategory_id IS NULL
        AND sub_category IS NOT NULL
        AND sub_category != ''
    `);

    const unmigrated = parseInt(nullCheck[0].count, 10);
    if (unmigrated > 0) {
      throw new Error(
        `Cannot drop old columns: ${unmigrated} expense_item rows have sub_category but no subcategory_id. ` +
        'Run manual-scripts/normalize-categories.sql first.'
      );
    }

    await queryInterface.removeColumn('expense_item', 'category');
    await queryInterface.removeColumn('expense_item', 'sub_category');
    await queryInterface.removeColumn('category', 'sub_subcategories');
    await queryInterface.removeColumn('article', 'category');
  },

  async down(queryInterface, Sequelize) {
    // Re-add the old columns (data will be lost)
    await queryInterface.addColumn('expense_item', 'category', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('expense_item', 'sub_category', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('category', 'sub_subcategories', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('article', 'category', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },
};

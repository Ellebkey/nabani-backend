'use strict';

/**
 * Adds a per-store `sku` to articles (e.g. Costco item number, Walmart produce PLU)
 * alongside the existing universal `barcode` (EAN/UPC). Both are used for exact-match
 * lookups by the receipt matcher (barcode -> sku -> fuzzy), scoped per user.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('article', 'sku', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addIndex('article', ['user_id', 'sku'], {
      name: 'idx_article_user_sku',
    });
    await queryInterface.addIndex('article', ['user_id', 'barcode'], {
      name: 'idx_article_user_barcode',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('article', 'idx_article_user_barcode');
    await queryInterface.removeIndex('article', 'idx_article_user_sku');
    await queryInterface.removeColumn('article', 'sku');
  },
};

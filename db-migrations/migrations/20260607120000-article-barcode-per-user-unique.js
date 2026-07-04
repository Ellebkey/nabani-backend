'use strict';

/**
 * Make `barcode` uniqueness PER-USER instead of global.
 * Two different users can scan/learn the same product barcode; a single user
 * still can't have the same barcode on two articles. NULL barcodes are unbounded.
 * IF EXISTS is used because dev schemas may have been built via sequelize.sync().
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop global uniqueness (column constraint + legacy partial index if present).
    await queryInterface.sequelize.query('ALTER TABLE article DROP CONSTRAINT IF EXISTS article_barcode_key;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS article_barcode_idx;');
    // Replace the non-unique lookup index with a per-user unique partial one.
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_article_user_barcode;');
    await queryInterface.addIndex('article', ['user_id', 'barcode'], {
      name: 'idx_article_user_barcode_unique',
      unique: true,
      where: { barcode: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_article_user_barcode_unique;');
    await queryInterface.addIndex('article', ['user_id', 'barcode'], {
      name: 'idx_article_user_barcode',
    });
    // Restore global uniqueness (fails if cross-user duplicate barcodes now exist).
    await queryInterface.sequelize.query('ALTER TABLE article ADD CONSTRAINT article_barcode_key UNIQUE (barcode);');
  },
};

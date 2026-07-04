'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('article', 'barcode', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
    });

    // Add index for faster barcode lookups
    await queryInterface.addIndex('article', ['barcode'], {
      name: 'article_barcode_idx',
      unique: true,
      where: {
        barcode: { [Sequelize.Op.ne]: null },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('article', 'article_barcode_idx');
    await queryInterface.removeColumn('article', 'barcode');
  },
};

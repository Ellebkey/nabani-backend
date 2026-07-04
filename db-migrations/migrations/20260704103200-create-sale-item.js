'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale_item', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      sale_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sale', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'package', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      sub_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    });

    await queryInterface.addIndex('sale_item', ['sale_id']);
    await queryInterface.addIndex('sale_item', ['package_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_item');
  },
};

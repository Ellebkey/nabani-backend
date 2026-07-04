'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_day', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      sale_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'sale', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      payment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'payment', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'package', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      menu_day_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'menu_day', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      delivery_date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      type: { type: Sequelize.STRING(20), allowNull: false },
      has_menu: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      authorized: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.STRING(20), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('delivery_day', ['patient_id', 'delivery_date']);
    await queryInterface.addIndex('delivery_day', ['delivery_date']);
    await queryInterface.addIndex('delivery_day', ['sale_id']);
    await queryInterface.addIndex('delivery_day', ['payment_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_day');
  },
};

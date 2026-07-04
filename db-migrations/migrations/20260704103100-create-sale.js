'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      folio: { type: Sequelize.STRING(40), allowNull: true },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'package', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: { type: Sequelize.STRING(20), allowNull: false },
      total_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      billing: { type: Sequelize.STRING(20), allowNull: false },
      discount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      payment_type: { type: Sequelize.STRING(30), allowNull: true },
      invoice_requested: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
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

    await queryInterface.addIndex('sale', ['patient_id']);
    await queryInterface.addIndex('sale', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale');
  },
};

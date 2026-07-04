'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      folio: { type: Sequelize.STRING(40), allowNull: true },
      sale_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sale', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      method: { type: Sequelize.STRING(20), allowNull: true },
      paid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.addIndex('payment', ['sale_id']);
    await queryInterface.addIndex('payment', ['patient_id']);
    await queryInterface.addIndex('payment', ['due_date']);
    await queryInterface.addIndex('payment', ['paid']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment');
  },
};

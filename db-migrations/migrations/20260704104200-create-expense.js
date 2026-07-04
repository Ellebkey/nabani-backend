'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expense', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      folio: { type: Sequelize.STRING(40), allowNull: true },
      beneficiary_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'beneficiary', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      concept: { type: Sequelize.STRING(200), allowNull: false },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      expense_date: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.STRING(20), allowNull: false },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'employee', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      comments: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.addIndex('expense', ['expense_date']);
    await queryInterface.addIndex('expense', ['type']);
    await queryInterface.addIndex('expense', ['beneficiary_id']);
    await queryInterface.addIndex('expense', ['employee_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expense');
  },
};

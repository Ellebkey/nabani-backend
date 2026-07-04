'use strict';

/**
 * Staging table for scanned receipts before they become expenses.
 * The whole draft (items + match candidates + selections) lives in `data` (JSONB);
 * the scalar columns are for listing/scoping without parsing the blob.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('receipt_drafts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      store: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('receipt_drafts', ['user_id', 'status'], {
      name: 'idx_receipt_drafts_user_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('receipt_drafts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_receipt_drafts_status";');
  },
};

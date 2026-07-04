'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('expense', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.sequelize.query(`
      UPDATE expense SET user_id = (SELECT id FROM "user" LIMIT 1)
      WHERE user_id IS NULL
    `);

    await queryInterface.changeColumn('expense', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('expense', ['user_id'], {
      name: 'idx_expense_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('expense', 'idx_expense_user_id');
    await queryInterface.removeColumn('expense', 'user_id');
  },
};

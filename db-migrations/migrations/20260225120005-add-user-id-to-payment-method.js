'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payment_method', 'user_id', {
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
      UPDATE payment_method SET user_id = (SELECT id FROM "user" LIMIT 1)
      WHERE user_id IS NULL
    `);

    await queryInterface.changeColumn('payment_method', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('payment_method', ['user_id'], {
      name: 'idx_payment_method_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('payment_method', 'idx_payment_method_user_id');
    await queryInterface.removeColumn('payment_method', 'user_id');
  },
};

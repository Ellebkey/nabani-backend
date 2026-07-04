'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('recipient', 'user_id', {
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
      UPDATE recipient SET user_id = (SELECT id FROM "user" LIMIT 1)
      WHERE user_id IS NULL
    `);

    await queryInterface.changeColumn('recipient', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('recipient', ['user_id'], {
      name: 'idx_recipient_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('recipient', 'idx_recipient_user_id');
    await queryInterface.removeColumn('recipient', 'user_id');
  },
};

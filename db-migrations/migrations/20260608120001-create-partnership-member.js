'use strict';

/**
 * Membership of a user in a partnership. The creator is the 'owner';
 * the accepted invitee is a 'partner'. Capped at two active members.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partnership_member', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      partnership_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'partnership', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('owner', 'partner'),
        allowNull: false,
        defaultValue: 'partner',
      },
      status: {
        type: Sequelize.ENUM('active', 'removed'),
        allowNull: false,
        defaultValue: 'active',
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

    await queryInterface.addIndex('partnership_member', ['partnership_id', 'user_id'], {
      name: 'idx_partnership_member_unique',
      unique: true,
    });

    await queryInterface.addIndex('partnership_member', ['user_id'], {
      name: 'idx_partnership_member_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('partnership_member');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_partnership_member_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_partnership_member_status";');
  },
};

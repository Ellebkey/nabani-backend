'use strict';

/**
 * An invitation for a second partner to join a partnership.
 * Only the sha256 hash of the token is stored; the raw token is returned once.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partnership_invite', {
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
      inviter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      invitee_email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'declined', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('partnership_invite', ['token_hash'], {
      name: 'idx_partnership_invite_token',
    });

    await queryInterface.addIndex('partnership_invite', ['invitee_email', 'status'], {
      name: 'idx_partnership_invite_email',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('partnership_invite');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_partnership_invite_status";');
  },
};

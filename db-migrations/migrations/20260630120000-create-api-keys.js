'use strict';

/**
 * API keys for programmatic, server-to-server access (external integrations,
 * automations). Each key acts ON BEHALF OF a real user (`user_id`) and is
 * limited by its `scopes`. Only the SHA-256 `key_hash` is stored — never the
 * plaintext key. Keys are revocable (`revoked_at`) and optionally expiring
 * (`expires_at`).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      key_prefix: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      key_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
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

    // Unique lookup by hash — the auth middleware resolves a key by its SHA-256.
    await queryInterface.addIndex('api_keys', ['key_hash'], {
      name: 'idx_api_keys_key_hash',
      unique: true,
    });

    // List/scope a user's keys without scanning the table.
    await queryInterface.addIndex('api_keys', ['user_id'], {
      name: 'idx_api_keys_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
  },
};

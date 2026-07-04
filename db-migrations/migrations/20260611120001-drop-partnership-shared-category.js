'use strict';

/**
 * Drops the v1 opt-in shared-category table. Family Mode v2 inverts sharing
 * to exclusion-based (partnership_excluded_category), so the opt-in list is
 * no longer read anywhere.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('partnership_shared_category');
  },

  async down(queryInterface, Sequelize) {
    // Re-create the old opt-in table (data will be lost)
    await queryInterface.createTable('partnership_shared_category', {
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
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'category', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('partnership_shared_category', ['partnership_id', 'category_id'], {
      name: 'idx_partnership_shared_category_unique',
      unique: true,
    });
  },
};

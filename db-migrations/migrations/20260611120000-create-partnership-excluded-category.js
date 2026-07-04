'use strict';

/**
 * Categories a partnership has marked as excluded (personal). Sharing is
 * exclusion-based: an expense item is shared iff its category is NOT in
 * this table for the partnership. An empty exclusion list shares everything.
 *
 * The up() also backfills exclusions for existing active partnerships so
 * their 'Personal' category stays private after the v2 inversion.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('partnership_excluded_category', {
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

    await queryInterface.addIndex('partnership_excluded_category', ['partnership_id', 'category_id'], {
      name: 'idx_partnership_excluded_category_unique',
      unique: true,
    });

    await queryInterface.sequelize.query(`
      INSERT INTO partnership_excluded_category (partnership_id, category_id, created_at, updated_at)
      SELECT p.id, c.id, NOW(), NOW()
      FROM partnership p
      CROSS JOIN category c
      WHERE lower(c.name) = 'personal' AND p.status = 'active'
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('partnership_excluded_category');
  },
};

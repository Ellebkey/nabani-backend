'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add nullable user_id column
    await queryInterface.addColumn('tag', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Backfill with the first user
    await queryInterface.sequelize.query(`
      UPDATE tag SET user_id = (SELECT id FROM "user" LIMIT 1)
      WHERE user_id IS NULL
    `);

    // Set NOT NULL
    await queryInterface.changeColumn('tag', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Remove old unique constraint on name, add composite unique(name, user_id)
    await queryInterface.removeConstraint('tag', 'tag_name_key').catch(() => {
      // Constraint may not exist or have different name
    });
    await queryInterface.addConstraint('tag', {
      fields: ['name', 'user_id'],
      type: 'unique',
      name: 'tag_name_user_id_unique',
    });

    // Add index
    await queryInterface.addIndex('tag', ['user_id'], {
      name: 'idx_tag_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('tag', 'idx_tag_user_id');
    await queryInterface.removeConstraint('tag', 'tag_name_user_id_unique').catch(() => {});
    await queryInterface.addConstraint('tag', {
      fields: ['name'],
      type: 'unique',
      name: 'tag_name_key',
    });
    await queryInterface.removeColumn('tag', 'user_id');
  },
};

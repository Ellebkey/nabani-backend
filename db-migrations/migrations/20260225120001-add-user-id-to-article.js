'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('article', 'user_id', {
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
      UPDATE article SET user_id = (SELECT id FROM "user" LIMIT 1)
      WHERE user_id IS NULL
    `);

    await queryInterface.changeColumn('article', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('article', ['user_id'], {
      name: 'idx_article_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('article', 'idx_article_user_id');
    await queryInterface.removeColumn('article', 'user_id');
  },
};

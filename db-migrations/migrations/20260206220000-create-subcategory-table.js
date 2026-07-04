'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subcategory', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'category',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('subcategory', {
      fields: ['name', 'category_id'],
      type: 'unique',
      name: 'uq_subcategory_name_category',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subcategory');
  },
};

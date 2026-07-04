'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      first_name: { type: Sequelize.STRING(80), allowNull: false },
      last_name: { type: Sequelize.STRING(80), allowNull: false },
      email: { type: Sequelize.STRING(120), allowNull: true },
      cellphone: { type: Sequelize.STRING(20), allowNull: true },
      gender: { type: Sequelize.STRING(20), allowNull: true },
      birthday: { type: Sequelize.DATEONLY, allowNull: true },
      week: { type: Sequelize.STRING(2), allowNull: true },
      zone: { type: Sequelize.STRING(80), allowNull: true },
      tuppers: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      other_food: { type: Sequelize.TEXT, allowNull: true },
      other_diseases: { type: Sequelize.TEXT, allowNull: true },
      other_preferences: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'inactivo' },
      calorie_level_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'calorie_level', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      nutriologa_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('patient', ['status']);
    await queryInterface.addIndex('patient', ['nutriologa_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient');
  },
};

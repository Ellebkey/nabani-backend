'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nutrition_plan', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'patient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      calorie_level_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'calorie_level', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      verduras: { type: Sequelize.INTEGER, allowNull: true },
      frutas: { type: Sequelize.INTEGER, allowNull: true },
      cereales: { type: Sequelize.INTEGER, allowNull: true },
      lacteos: { type: Sequelize.INTEGER, allowNull: true },
      p_desayuno: { type: Sequelize.INTEGER, allowNull: true },
      p_comida: { type: Sequelize.INTEGER, allowNull: true },
      p_cena: { type: Sequelize.INTEGER, allowNull: true },
      aceites: { type: Sequelize.INTEGER, allowNull: true },
      semillas: { type: Sequelize.INTEGER, allowNull: true },
      comments: { type: Sequelize.TEXT, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nutrition_plan');
  },
};

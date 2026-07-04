'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patient', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nutriologa_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      consult_date: { type: Sequelize.DATEONLY, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      type: { type: Sequelize.STRING(20), allowNull: false },
      weight: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      body_fat: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      muscle: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      water: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      arm: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      waist: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      abdomen: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      hip: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      height: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      age: { type: Sequelize.INTEGER, allowNull: true },
      objetivo_kcal: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('consultation', ['patient_id', 'consult_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation');
  },
};

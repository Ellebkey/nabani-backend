'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_address', {
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
      street: { type: Sequelize.STRING(120), allowNull: true },
      number_ext: { type: Sequelize.STRING(20), allowNull: true },
      number_int: { type: Sequelize.STRING(20), allowNull: true },
      neighborhood: { type: Sequelize.STRING(120), allowNull: true },
      zip_code: { type: Sequelize.STRING(10), allowNull: true },
      city: { type: Sequelize.STRING(80), allowNull: true },
      state: { type: Sequelize.STRING(80), allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_address');
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_disease', {
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
      disease_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'disease', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addIndex('patient_disease', ['patient_id', 'disease_id'], {
      unique: true,
      name: 'patient_disease_patient_id_disease_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_disease');
  },
};

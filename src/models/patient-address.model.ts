import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { PatientInstance } from '@models/patient.model';

/**
 * PatientAddress — the single delivery address for a patient (hasOne). Used by
 * reparto/production (Group D) and shown on the patient detail.
 */
export class PatientAddressInstance extends BaseModelInstance<PatientAddressInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare street: CreationOptional<string | null>;
  declare numberExt: CreationOptional<string | null>;
  declare numberInt: CreationOptional<string | null>;
  declare neighborhood: CreationOptional<string | null>;
  declare zipCode: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare state: CreationOptional<string | null>;
  declare patient?: NonAttribute<PatientInstance>;
}

const PatientAddressFactory = (sequelize: Sequelize): ModelClass<PatientAddressInstance> => {
  PatientAddressInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false, unique: true },
      street: { type: DataTypes.STRING(120), allowNull: true },
      numberExt: { field: 'number_ext', type: DataTypes.STRING(20), allowNull: true },
      numberInt: { field: 'number_int', type: DataTypes.STRING(20), allowNull: true },
      neighborhood: { type: DataTypes.STRING(120), allowNull: true },
      zipCode: { field: 'zip_code', type: DataTypes.STRING(10), allowNull: true },
      city: { type: DataTypes.STRING(80), allowNull: true },
      state: { type: DataTypes.STRING(80), allowNull: true },
    },
    {
      sequelize,
      tableName: 'patient_address',
      underscored: true,
      timestamps: false,
      modelName: 'PatientAddress',
    },
  );

  PatientAddressInstance.associate = (models) => {
    PatientAddressInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
  };

  return PatientAddressInstance as ModelClass<PatientAddressInstance>;
};

export default PatientAddressFactory;

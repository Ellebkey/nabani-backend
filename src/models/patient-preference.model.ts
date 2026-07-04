import { Sequelize, DataTypes, CreationOptional, ForeignKey } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * PatientPreference — join: ingredients a patient does NOT want ("no me gusta").
 * Drives preference-conflict flagging (amber) when resolving their menú (Group D).
 */
export class PatientPreferenceInstance extends BaseModelInstance<PatientPreferenceInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare ingredientId: ForeignKey<string>;
}

const PatientPreferenceFactory = (sequelize: Sequelize): ModelClass<PatientPreferenceInstance> => {
  PatientPreferenceInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      ingredientId: { field: 'ingredient_id', type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      tableName: 'patient_preference',
      underscored: true,
      timestamps: false,
      modelName: 'PatientPreference',
      indexes: [{ unique: true, fields: ['patient_id', 'ingredient_id'] }],
    },
  );

  return PatientPreferenceInstance as ModelClass<PatientPreferenceInstance>;
};

export default PatientPreferenceFactory;

import { Sequelize, DataTypes, CreationOptional, ForeignKey } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * PatientDisease — join: the enfermedades a patient has. Drives disease-conflict
 * flagging (blue) when resolving their menú (Group D).
 */
export class PatientDiseaseInstance extends BaseModelInstance<PatientDiseaseInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare diseaseId: ForeignKey<string>;
}

const PatientDiseaseFactory = (sequelize: Sequelize): ModelClass<PatientDiseaseInstance> => {
  PatientDiseaseInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      diseaseId: { field: 'disease_id', type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      tableName: 'patient_disease',
      underscored: true,
      timestamps: false,
      modelName: 'PatientDisease',
      indexes: [{ unique: true, fields: ['patient_id', 'disease_id'] }],
    },
  );

  return PatientDiseaseInstance as ModelClass<PatientDiseaseInstance>;
};

export default PatientDiseaseFactory;

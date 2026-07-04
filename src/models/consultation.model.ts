import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { PatientInstance } from '@models/patient.model';
import type { UserInstance } from '@models/user.model';

export type ConsultationType = 'inicial' | 'seguimiento';

/**
 * Consultation — a clinical visit for a patient: fecha, precio, tipo (inicial|
 * seguimiento) and body measurements. History is shown desc; deltas vs. the
 * previous visit are computed by the frontend.
 */
export class ConsultationInstance extends BaseModelInstance<ConsultationInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare nutriologaId: CreationOptional<ForeignKey<string | null>>;
  declare consultDate: string;
  declare price: CreationOptional<number>;
  declare type: ConsultationType;
  declare weight: CreationOptional<number | null>;
  declare bodyFat: CreationOptional<number | null>;
  declare muscle: CreationOptional<number | null>;
  declare water: CreationOptional<number | null>;
  declare arm: CreationOptional<number | null>;
  declare waist: CreationOptional<number | null>;
  declare abdomen: CreationOptional<number | null>;
  declare hip: CreationOptional<number | null>;
  declare height: CreationOptional<number | null>;
  declare age: CreationOptional<number | null>;
  declare objetivoKcal: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<string>;
  declare patient?: NonAttribute<PatientInstance>;
  declare nutriologa?: NonAttribute<UserInstance>;
}

const ConsultationFactory = (sequelize: Sequelize): ModelClass<ConsultationInstance> => {
  ConsultationInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      nutriologaId: { field: 'nutriologa_id', type: DataTypes.UUID, allowNull: true },
      consultDate: { field: 'consult_date', type: DataTypes.DATEONLY, allowNull: false },
      price: {
        type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      type: { type: DataTypes.STRING(20), allowNull: false },
      weight: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      bodyFat: { field: 'body_fat', type: DataTypes.DECIMAL(8, 2), allowNull: true },
      muscle: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      water: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      arm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      waist: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      abdomen: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      hip: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      height: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      age: { type: DataTypes.INTEGER, allowNull: true },
      objetivoKcal: { field: 'objetivo_kcal', type: DataTypes.INTEGER, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'consultation',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      modelName: 'Consultation',
      indexes: [{ fields: ['patient_id', 'consult_date'] }],
    },
  );

  ConsultationInstance.associate = (models) => {
    ConsultationInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    ConsultationInstance.belongsTo(models.User, { as: 'nutriologa', foreignKey: 'nutriologa_id' });
  };

  return ConsultationInstance as ModelClass<ConsultationInstance>;
};

export default ConsultationFactory;

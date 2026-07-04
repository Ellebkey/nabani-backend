import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { PatientInstance } from '@models/patient.model';
import type { CalorieLevelInstance } from '@models/calorie-level.model';

/**
 * NutritionPlan — the patient's plan distribution (raciones por grupo + comidas)
 * at a chosen calorie level. One per patient (hasOne).
 */
export class NutritionPlanInstance extends BaseModelInstance<NutritionPlanInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare calorieLevelId: CreationOptional<ForeignKey<string | null>>;
  declare verduras: CreationOptional<number | null>;
  declare frutas: CreationOptional<number | null>;
  declare cereales: CreationOptional<number | null>;
  declare lacteos: CreationOptional<number | null>;
  declare pDesayuno: CreationOptional<number | null>;
  declare pComida: CreationOptional<number | null>;
  declare pCena: CreationOptional<number | null>;
  declare aceites: CreationOptional<number | null>;
  declare semillas: CreationOptional<number | null>;
  declare comments: CreationOptional<string | null>;
  declare patient?: NonAttribute<PatientInstance>;
  declare calorieLevel?: NonAttribute<CalorieLevelInstance>;
}

const NutritionPlanFactory = (sequelize: Sequelize): ModelClass<NutritionPlanInstance> => {
  NutritionPlanInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false, unique: true },
      calorieLevelId: { field: 'calorie_level_id', type: DataTypes.UUID, allowNull: true },
      verduras: { type: DataTypes.INTEGER, allowNull: true },
      frutas: { type: DataTypes.INTEGER, allowNull: true },
      cereales: { type: DataTypes.INTEGER, allowNull: true },
      lacteos: { type: DataTypes.INTEGER, allowNull: true },
      pDesayuno: { field: 'p_desayuno', type: DataTypes.INTEGER, allowNull: true },
      pComida: { field: 'p_comida', type: DataTypes.INTEGER, allowNull: true },
      pCena: { field: 'p_cena', type: DataTypes.INTEGER, allowNull: true },
      aceites: { type: DataTypes.INTEGER, allowNull: true },
      semillas: { type: DataTypes.INTEGER, allowNull: true },
      comments: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      tableName: 'nutrition_plan',
      underscored: true,
      timestamps: false,
      modelName: 'NutritionPlan',
    },
  );

  NutritionPlanInstance.associate = (models) => {
    NutritionPlanInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    NutritionPlanInstance.belongsTo(models.CalorieLevel, { as: 'calorieLevel', foreignKey: 'calorie_level_id' });
  };

  return NutritionPlanInstance as ModelClass<NutritionPlanInstance>;
};

export default NutritionPlanFactory;

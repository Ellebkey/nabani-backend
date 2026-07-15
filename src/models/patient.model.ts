import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { CalorieLevelInstance } from '@models/calorie-level.model';
import type { UserInstance } from '@models/user.model';
import type { DiseaseInstance } from '@models/disease.model';
import type { IngredientInstance } from '@models/ingredient.model';
import type { PatientAddressInstance } from '@models/patient-address.model';
import type { NutritionPlanInstance } from '@models/nutrition-plan.model';
import type { ConsultationInstance } from '@models/consultation.model';

export type PatientWeek = 'LD' | 'LV' | 'LS';
export type PatientStatus = 'activo' | 'inactivo';

/**
 * Patient — clinic-wide patient record. Carries general data plus (via associations)
 * a single address, one nutrition plan, their enfermedades (diseases) and preferencias
 * (ingredient dislikes). `status` stays `inactivo` until the first sale (Group D).
 */
export class PatientInstance extends BaseModelInstance<PatientInstance> {
  declare id: CreationOptional<string>;
  declare firstName: string;
  declare lastName: string;
  declare email: CreationOptional<string | null>;
  declare cellphone: CreationOptional<string | null>;
  declare gender: CreationOptional<string | null>;
  declare birthday: CreationOptional<string | null>;
  declare week: CreationOptional<PatientWeek | null>;
  declare zone: CreationOptional<string | null>;
  declare tuppers: CreationOptional<boolean>;
  declare otherFood: CreationOptional<string | null>;
  declare otherDiseases: CreationOptional<string | null>;
  declare otherPreferences: CreationOptional<string | null>;
  declare status: CreationOptional<PatientStatus>;
  declare calorieLevelId: CreationOptional<ForeignKey<string | null>>;
  declare nutriologaId: CreationOptional<ForeignKey<string | null>>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare calorieLevel?: NonAttribute<CalorieLevelInstance>;
  declare nutriologa?: NonAttribute<UserInstance>;
  declare address?: NonAttribute<PatientAddressInstance>;
  declare nutritionPlan?: NonAttribute<NutritionPlanInstance>;
  declare diseases?: NonAttribute<DiseaseInstance[]>;
  declare preferences?: NonAttribute<IngredientInstance[]>;
  declare consultations?: NonAttribute<ConsultationInstance[]>;
}

const PatientFactory = (sequelize: Sequelize): ModelClass<PatientInstance> => {
  PatientInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      firstName: { field: 'first_name', type: DataTypes.STRING(80), allowNull: false },
      lastName: { field: 'last_name', type: DataTypes.STRING(80), allowNull: false },
      email: { type: DataTypes.STRING(120), allowNull: true },
      cellphone: { type: DataTypes.STRING(20), allowNull: true },
      gender: { type: DataTypes.STRING(20), allowNull: true },
      birthday: { type: DataTypes.DATEONLY, allowNull: true },
      week: { type: DataTypes.STRING(2), allowNull: true },
      zone: { type: DataTypes.STRING(80), allowNull: true },
      tuppers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      otherFood: { field: 'other_food', type: DataTypes.TEXT, allowNull: true },
      otherDiseases: { field: 'other_diseases', type: DataTypes.TEXT, allowNull: true },
      otherPreferences: { field: 'other_preferences', type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(10), allowNull: false, defaultValue: 'inactivo',
      },
      calorieLevelId: { field: 'calorie_level_id', type: DataTypes.UUID, allowNull: true },
      nutriologaId: { field: 'nutriologa_id', type: DataTypes.UUID, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'patient',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Patient',
      indexes: [
        { fields: ['nutriologa_id'] },
        { fields: ['status'] },
      ],
    },
  );

  PatientInstance.associate = (models) => {
    PatientInstance.hasOne(models.PatientAddress, { as: 'address', foreignKey: 'patient_id' });
    PatientInstance.hasOne(models.NutritionPlan, { as: 'nutritionPlan', foreignKey: 'patient_id' });
    PatientInstance.belongsToMany(models.Disease, {
      through: models.PatientDisease,
      as: 'diseases',
      foreignKey: 'patient_id',
      otherKey: 'disease_id',
    });
    PatientInstance.belongsToMany(models.Ingredient, {
      through: models.PatientPreference,
      as: 'preferences',
      foreignKey: 'patient_id',
      otherKey: 'ingredient_id',
    });
    PatientInstance.belongsTo(models.CalorieLevel, { as: 'calorieLevel', foreignKey: 'calorie_level_id' });
    PatientInstance.belongsTo(models.User, { as: 'nutriologa', foreignKey: 'nutriologa_id' });
    PatientInstance.hasMany(models.Consultation, { as: 'consultations', foreignKey: 'patient_id' });
  };

  return PatientInstance as ModelClass<PatientInstance>;
};

export default PatientFactory;

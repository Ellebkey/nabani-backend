import {
  Sequelize, DataTypes, CreationOptional, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { DiseaseInstance } from '@models/disease.model';

export type FoodGroup = 'verdura' | 'fruta' | 'cereal' | 'lacteo' | 'condimento' | 'otros';
export type Unit = 'gr' | 'ml' | 'pzas';

/**
 * Ingredient — catalog with food group, base gramaje and the "No apto para" disease
 * incompatibilities (via ingredient_disease) that drive menu conflict detection.
 */
export class IngredientInstance extends BaseModelInstance<IngredientInstance> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare foodGroup: FoodGroup;
  declare baseUnit: Unit;
  declare baseQuantity: number;
  declare lastPrice: CreationOptional<number | null>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare diseases?: NonAttribute<DiseaseInstance[]>;
}

const IngredientFactory = (sequelize: Sequelize): ModelClass<IngredientInstance> => {
  IngredientInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(80), allowNull: false },
      foodGroup: { field: 'food_group', type: DataTypes.STRING(20), allowNull: false },
      baseUnit: { field: 'base_unit', type: DataTypes.STRING(10), allowNull: false, defaultValue: 'gr' },
      baseQuantity: {
        field: 'base_quantity', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      lastPrice: { field: 'last_price', type: DataTypes.DECIMAL(10, 2), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'ingredient',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Ingredient',
    },
  );

  IngredientInstance.associate = (models) => {
    IngredientInstance.belongsToMany(models.Disease, {
      through: models.IngredientDisease,
      as: 'diseases',
      foreignKey: 'ingredient_id',
      otherKey: 'disease_id',
    });
  };

  return IngredientInstance as ModelClass<IngredientInstance>;
};

export default IngredientFactory;

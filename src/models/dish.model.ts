import {
  Sequelize, DataTypes, CreationOptional, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { DishIngredientInstance } from '@models/dish-ingredient.model';

export type MealTime = 'desayuno' | 'snack' | 'comida' | 'cena';

/**
 * Dish — a reusable plato in the biblioteca de platillos (built by nutriólogas).
 * Each dish carries its ingredients (with per-calorie-level portions) and is placed
 * into menús del día. `usage_count` tracks how often it has been used.
 */
export class DishInstance extends BaseModelInstance<DishInstance> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare mealTime: MealTime;
  declare usageCount: CreationOptional<number>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare ingredients?: NonAttribute<DishIngredientInstance[]>;
}

const DishFactory = (sequelize: Sequelize): ModelClass<DishInstance> => {
  DishInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(120), allowNull: false },
      mealTime: { field: 'meal_time', type: DataTypes.STRING(20), allowNull: false },
      usageCount: {
        field: 'usage_count', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'dish',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Dish',
      indexes: [
        { fields: ['meal_time'] },
      ],
    },
  );

  DishInstance.associate = (models) => {
    DishInstance.hasMany(models.DishIngredient, {
      as: 'ingredients',
      foreignKey: 'dish_id',
    });
  };

  return DishInstance as ModelClass<DishInstance>;
};

export default DishFactory;

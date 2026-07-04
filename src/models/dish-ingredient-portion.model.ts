import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { CalorieLevelInstance } from '@models/calorie-level.model';

/**
 * DishIngredientPortion — how many portions of a dish ingredient are served at a
 * given calorie level (1300/1700/2000…). One row per (dish_ingredient, calorie_level).
 */
export class DishIngredientPortionInstance
  extends BaseModelInstance<DishIngredientPortionInstance> {
  declare id: CreationOptional<string>;
  declare dishIngredientId: ForeignKey<string>;
  declare calorieLevelId: ForeignKey<string>;
  declare portions: number;
  declare calorieLevel?: NonAttribute<CalorieLevelInstance>;
}

const DishIngredientPortionFactory = (
  sequelize: Sequelize,
): ModelClass<DishIngredientPortionInstance> => {
  DishIngredientPortionInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      dishIngredientId: { field: 'dish_ingredient_id', type: DataTypes.UUID, allowNull: false },
      calorieLevelId: { field: 'calorie_level_id', type: DataTypes.UUID, allowNull: false },
      portions: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: 'dish_ingredient_portion',
      underscored: true,
      timestamps: false,
      modelName: 'DishIngredientPortion',
      indexes: [{ unique: true, fields: ['dish_ingredient_id', 'calorie_level_id'] }],
    },
  );

  DishIngredientPortionInstance.associate = (models) => {
    DishIngredientPortionInstance.belongsTo(models.DishIngredient, {
      foreignKey: 'dish_ingredient_id',
    });
    DishIngredientPortionInstance.belongsTo(models.CalorieLevel, {
      as: 'calorieLevel',
      foreignKey: 'calorie_level_id',
    });
  };

  return DishIngredientPortionInstance as ModelClass<DishIngredientPortionInstance>;
};

export default DishIngredientPortionFactory;

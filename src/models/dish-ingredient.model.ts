import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { Unit, IngredientInstance } from '@models/ingredient.model';
import type { DishIngredientPortionInstance } from '@models/dish-ingredient-portion.model';

/**
 * DishIngredient — an ingredient line within a dish: its base gramaje/unit and
 * ordering position. Per-calorie-level portions hang off it (dish_ingredient_portion).
 */
export class DishIngredientInstance extends BaseModelInstance<DishIngredientInstance> {
  declare id: CreationOptional<string>;
  declare dishId: ForeignKey<string>;
  declare ingredientId: ForeignKey<string>;
  declare baseQuantity: number;
  declare unit: Unit;
  declare position: CreationOptional<number>;
  declare ingredient?: NonAttribute<IngredientInstance>;
  declare portions?: NonAttribute<DishIngredientPortionInstance[]>;
}

const DishIngredientFactory = (sequelize: Sequelize): ModelClass<DishIngredientInstance> => {
  DishIngredientInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      dishId: { field: 'dish_id', type: DataTypes.UUID, allowNull: false },
      ingredientId: { field: 'ingredient_id', type: DataTypes.UUID, allowNull: false },
      baseQuantity: {
        field: 'base_quantity', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      unit: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'gr' },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: 'dish_ingredient',
      underscored: true,
      timestamps: false,
      modelName: 'DishIngredient',
    },
  );

  DishIngredientInstance.associate = (models) => {
    DishIngredientInstance.belongsTo(models.Dish, { foreignKey: 'dish_id' });
    DishIngredientInstance.belongsTo(models.Ingredient, {
      as: 'ingredient',
      foreignKey: 'ingredient_id',
    });
    DishIngredientInstance.hasMany(models.DishIngredientPortion, {
      as: 'portions',
      foreignKey: 'dish_ingredient_id',
    });
  };

  return DishIngredientInstance as ModelClass<DishIngredientInstance>;
};

export default DishIngredientFactory;

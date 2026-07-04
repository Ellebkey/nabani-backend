import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { IngredientInstance } from '@models/ingredient.model';

export type ConflictType = 'preference' | 'disease';

/**
 * DeliveryMealIngredient — one resolved ingredient portion inside a delivery meal.
 * `conflict_type` flags preference (amber) / disease (blue) conflicts;
 * `substituted_from_ingredient_id` records the original when a swap was applied and
 * `eliminated` marks it removed.
 */
export class DeliveryMealIngredientInstance extends BaseModelInstance<DeliveryMealIngredientInstance> {
  declare id: CreationOptional<string>;
  declare deliveryMealId: ForeignKey<string>;
  declare ingredientId: ForeignKey<string>;
  declare portions: number;
  declare conflictType: CreationOptional<ConflictType | null>;
  declare substitutedFromIngredientId: CreationOptional<ForeignKey<string | null>>;
  declare eliminated: CreationOptional<boolean>;
  declare position: CreationOptional<number>;
  declare ingredient?: NonAttribute<IngredientInstance | null>;
  declare substitutedFrom?: NonAttribute<IngredientInstance | null>;
}

const DeliveryMealIngredientFactory = (
  sequelize: Sequelize,
): ModelClass<DeliveryMealIngredientInstance> => {
  DeliveryMealIngredientInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      deliveryMealId: { field: 'delivery_meal_id', type: DataTypes.UUID, allowNull: false },
      ingredientId: { field: 'ingredient_id', type: DataTypes.UUID, allowNull: false },
      portions: {
        type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0,
      },
      conflictType: { field: 'conflict_type', type: DataTypes.STRING(20), allowNull: true },
      substitutedFromIngredientId: {
        field: 'substituted_from_ingredient_id', type: DataTypes.UUID, allowNull: true,
      },
      eliminated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: 'delivery_meal_ingredient',
      underscored: true,
      timestamps: false,
      modelName: 'DeliveryMealIngredient',
      indexes: [
        { fields: ['delivery_meal_id'] },
        { fields: ['ingredient_id'] },
      ],
    },
  );

  DeliveryMealIngredientInstance.associate = (models) => {
    DeliveryMealIngredientInstance.belongsTo(models.DeliveryMeal, { as: 'deliveryMeal', foreignKey: 'delivery_meal_id' });
    DeliveryMealIngredientInstance.belongsTo(models.Ingredient, { as: 'ingredient', foreignKey: 'ingredient_id' });
    DeliveryMealIngredientInstance.belongsTo(models.Ingredient, { as: 'substitutedFrom', foreignKey: 'substituted_from_ingredient_id' });
  };

  return DeliveryMealIngredientInstance as ModelClass<DeliveryMealIngredientInstance>;
};

export default DeliveryMealIngredientFactory;

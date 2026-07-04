import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { DishInstance } from '@models/dish.model';
import type { DeliveryMealIngredientInstance } from '@models/delivery-meal-ingredient.model';

export type MealSlot = 'desayuno' | 'colacion1' | 'comida' | 'colacion2' | 'cena';

/**
 * DeliveryMeal — one resolved meal slot of a delivery day (the dish served and
 * whether it is included). Holds its resolved ingredient portions (as 'ingredients').
 */
export class DeliveryMealInstance extends BaseModelInstance<DeliveryMealInstance> {
  declare id: CreationOptional<string>;
  declare deliveryDayId: ForeignKey<string>;
  declare mealSlot: MealSlot;
  declare dishId: CreationOptional<ForeignKey<string | null>>;
  declare included: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare dish?: NonAttribute<DishInstance | null>;
  declare ingredients?: NonAttribute<DeliveryMealIngredientInstance[]>;
}

const DeliveryMealFactory = (sequelize: Sequelize): ModelClass<DeliveryMealInstance> => {
  DeliveryMealInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      deliveryDayId: { field: 'delivery_day_id', type: DataTypes.UUID, allowNull: false },
      mealSlot: { field: 'meal_slot', type: DataTypes.STRING(20), allowNull: false },
      dishId: { field: 'dish_id', type: DataTypes.UUID, allowNull: true },
      included: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'delivery_meal',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      modelName: 'DeliveryMeal',
      indexes: [
        { fields: ['delivery_day_id'] },
      ],
    },
  );

  DeliveryMealInstance.associate = (models) => {
    DeliveryMealInstance.belongsTo(models.DeliveryDay, { as: 'deliveryDay', foreignKey: 'delivery_day_id' });
    DeliveryMealInstance.belongsTo(models.Dish, { as: 'dish', foreignKey: 'dish_id' });
    DeliveryMealInstance.hasMany(models.DeliveryMealIngredient, { as: 'ingredients', foreignKey: 'delivery_meal_id' });
  };

  return DeliveryMealInstance as ModelClass<DeliveryMealInstance>;
};

export default DeliveryMealFactory;

import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { DishInstance } from '@models/dish.model';

export type MealSlot = 'desayuno' | 'colacion1' | 'comida' | 'colacion2' | 'cena';

/**
 * MenuDayMeal — one meal slot of a menú del día (desayuno/colacion1/comida/…),
 * optionally assigned a dish. One row per (menu_day, meal_slot).
 */
export class MenuDayMealInstance extends BaseModelInstance<MenuDayMealInstance> {
  declare id: CreationOptional<string>;
  declare menuDayId: ForeignKey<string>;
  declare mealSlot: MealSlot;
  declare dishId: CreationOptional<ForeignKey<string | null>>;
  declare position: CreationOptional<number>;
  declare dish?: NonAttribute<DishInstance | null>;
}

const MenuDayMealFactory = (sequelize: Sequelize): ModelClass<MenuDayMealInstance> => {
  MenuDayMealInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      menuDayId: { field: 'menu_day_id', type: DataTypes.UUID, allowNull: false },
      mealSlot: { field: 'meal_slot', type: DataTypes.STRING(20), allowNull: false },
      dishId: { field: 'dish_id', type: DataTypes.UUID, allowNull: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: 'menu_day_meal',
      underscored: true,
      timestamps: false,
      modelName: 'MenuDayMeal',
      indexes: [{ unique: true, fields: ['menu_day_id', 'meal_slot'] }],
    },
  );

  MenuDayMealInstance.associate = (models) => {
    MenuDayMealInstance.belongsTo(models.MenuDay, { foreignKey: 'menu_day_id' });
    MenuDayMealInstance.belongsTo(models.Dish, {
      as: 'dish',
      foreignKey: 'dish_id',
    });
  };

  return MenuDayMealInstance as ModelClass<MenuDayMealInstance>;
};

export default MenuDayMealFactory;

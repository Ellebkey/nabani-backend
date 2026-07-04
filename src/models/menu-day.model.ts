import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { UserInstance } from '@models/user.model';
import type { MenuDayMealInstance } from '@models/menu-day-meal.model';

export type MenuDayStatus = 'borrador' | 'sin_porciones' | 'completo';

/**
 * MenuDay — the menú del día template for a calendar date. Holds its 5 meal slots
 * (menu_day_meal) and drives menu resolution/production for that day's deliveries.
 */
export class MenuDayInstance extends BaseModelInstance<MenuDayInstance> {
  declare id: CreationOptional<string>;
  declare menuDate: string;
  declare status: CreationOptional<MenuDayStatus>;
  declare createdById: CreationOptional<ForeignKey<string | null>>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare createdBy?: NonAttribute<UserInstance | null>;
  declare meals?: NonAttribute<MenuDayMealInstance[]>;
}

const MenuDayFactory = (sequelize: Sequelize): ModelClass<MenuDayInstance> => {
  MenuDayInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      menuDate: {
        field: 'menu_date', type: DataTypes.DATEONLY, allowNull: false, unique: true,
      },
      status: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: 'borrador',
      },
      createdById: { field: 'created_by_id', type: DataTypes.UUID, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'menu_day',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'MenuDay',
    },
  );

  MenuDayInstance.associate = (models) => {
    MenuDayInstance.hasMany(models.MenuDayMeal, {
      as: 'meals',
      foreignKey: 'menu_day_id',
    });
    MenuDayInstance.belongsTo(models.User, {
      as: 'createdBy',
      foreignKey: 'created_by_id',
    });
  };

  return MenuDayInstance as ModelClass<MenuDayInstance>;
};

export default MenuDayFactory;

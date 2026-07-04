import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { MenuDayInstance } from '@models/menu-day.model';
import type { PackageInstance } from '@models/package.model';
import type { SaleInstance } from '@models/sale.model';
import type { PaymentInstance } from '@models/payment.model';
import type { DeliveryMealInstance } from '@models/delivery-meal.model';

export type DeliveryType = 'package' | 'consulta';

/**
 * DeliveryDay — one dated delivery for a patient (a package day or a consulta).
 * Links back to the sale + payment that generated it and, once a menú del día is
 * resolved, to the menu_day; carries its resolved meals (as 'meals').
 */
export class DeliveryDayInstance extends BaseModelInstance<DeliveryDayInstance> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<string>;
  declare saleId: CreationOptional<ForeignKey<string | null>>;
  declare paymentId: CreationOptional<ForeignKey<string | null>>;
  declare packageId: CreationOptional<ForeignKey<string | null>>;
  declare menuDayId: CreationOptional<ForeignKey<string | null>>;
  declare deliveryDate: string;
  declare amount: number;
  declare type: DeliveryType;
  declare hasMenu: CreationOptional<boolean>;
  declare authorized: CreationOptional<boolean>;
  declare status: CreationOptional<string | null>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare menuDay?: NonAttribute<MenuDayInstance | null>;
  declare package?: NonAttribute<PackageInstance | null>;
  declare sale?: NonAttribute<SaleInstance | null>;
  declare payment?: NonAttribute<PaymentInstance | null>;
  declare meals?: NonAttribute<DeliveryMealInstance[]>;
}

const DeliveryDayFactory = (sequelize: Sequelize): ModelClass<DeliveryDayInstance> => {
  DeliveryDayInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      saleId: { field: 'sale_id', type: DataTypes.UUID, allowNull: true },
      paymentId: { field: 'payment_id', type: DataTypes.UUID, allowNull: true },
      packageId: { field: 'package_id', type: DataTypes.UUID, allowNull: true },
      menuDayId: { field: 'menu_day_id', type: DataTypes.UUID, allowNull: true },
      deliveryDate: { field: 'delivery_date', type: DataTypes.DATEONLY, allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      type: { type: DataTypes.STRING(20), allowNull: false },
      hasMenu: {
        field: 'has_menu', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      authorized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING(20), allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'delivery_day',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'DeliveryDay',
      indexes: [
        { fields: ['patient_id', 'delivery_date'] },
        { fields: ['delivery_date'] },
        { fields: ['sale_id'] },
        { fields: ['payment_id'] },
      ],
    },
  );

  DeliveryDayInstance.associate = (models) => {
    DeliveryDayInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    DeliveryDayInstance.belongsTo(models.Sale, { as: 'sale', foreignKey: 'sale_id' });
    DeliveryDayInstance.belongsTo(models.Payment, { as: 'payment', foreignKey: 'payment_id' });
    DeliveryDayInstance.belongsTo(models.Package, { as: 'package', foreignKey: 'package_id' });
    DeliveryDayInstance.belongsTo(models.MenuDay, { as: 'menuDay', foreignKey: 'menu_day_id' });
    DeliveryDayInstance.hasMany(models.DeliveryMeal, { as: 'meals', foreignKey: 'delivery_day_id' });
  };

  return DeliveryDayInstance as ModelClass<DeliveryDayInstance>;
};

export default DeliveryDayFactory;

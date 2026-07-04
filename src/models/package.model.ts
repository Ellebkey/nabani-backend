import { Sequelize, DataTypes, CreationOptional } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * Package — a meal-prep plan sold to patients (precio por día, consult price, the
 * meal slots it includes and its month/couple/especial discounts). Drives sale
 * pricing and the delivery meal slots generated per day.
 */
export class PackageInstance extends BaseModelInstance<PackageInstance> {
  declare id: CreationOptional<string>;
  declare displayLabel: string;
  declare code: string;
  declare pricePerDay: number;
  declare consultPrice: CreationOptional<number | null>;
  declare monthDiscount: CreationOptional<number>;
  declare coupleDiscount: CreationOptional<number>;
  declare especialDiscount: CreationOptional<number>;
  declare includesDesayuno: CreationOptional<boolean>;
  declare includesSnack1: CreationOptional<boolean>;
  declare includesComida: CreationOptional<boolean>;
  declare includesSnack2: CreationOptional<boolean>;
  declare includesCena: CreationOptional<boolean>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const PackageFactory = (sequelize: Sequelize): ModelClass<PackageInstance> => {
  PackageInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      displayLabel: { field: 'display_label', type: DataTypes.STRING(80), allowNull: false },
      code: { type: DataTypes.STRING(40), allowNull: false },
      pricePerDay: {
        field: 'price_per_day', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      consultPrice: { field: 'consult_price', type: DataTypes.DECIMAL(10, 2), allowNull: true },
      monthDiscount: {
        field: 'month_discount', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
      },
      coupleDiscount: {
        field: 'couple_discount', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
      },
      especialDiscount: {
        field: 'especial_discount', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
      },
      includesDesayuno: {
        field: 'includes_desayuno', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      includesSnack1: {
        field: 'includes_snack1', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      includesComida: {
        field: 'includes_comida', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      includesSnack2: {
        field: 'includes_snack2', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      includesCena: {
        field: 'includes_cena', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'package',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Package',
    },
  );

  return PackageInstance as ModelClass<PackageInstance>;
};

export default PackageFactory;

import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { PackageInstance } from '@models/package.model';

/**
 * SaleItem — a line item on a sale: the package sold, quantity and per-unit price.
 * Also the through table for Sale ⇄ Package (as 'items').
 */
export class SaleItemInstance extends BaseModelInstance<SaleItemInstance> {
  declare id: CreationOptional<string>;
  declare saleId: ForeignKey<string>;
  declare packageId: ForeignKey<string>;
  declare quantity: number;
  declare unitPrice: number;
  declare subTotal: number;
  declare package?: NonAttribute<PackageInstance | null>;
}

const SaleItemFactory = (sequelize: Sequelize): ModelClass<SaleItemInstance> => {
  SaleItemInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      saleId: { field: 'sale_id', type: DataTypes.UUID, allowNull: false },
      packageId: { field: 'package_id', type: DataTypes.UUID, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      unitPrice: {
        field: 'unit_price', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      subTotal: {
        field: 'sub_total', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'sale_item',
      underscored: true,
      timestamps: false,
      modelName: 'SaleItem',
      indexes: [
        { fields: ['sale_id'] },
        { fields: ['package_id'] },
      ],
    },
  );

  SaleItemInstance.associate = (models) => {
    SaleItemInstance.belongsTo(models.Sale, { as: 'sale', foreignKey: 'sale_id' });
    SaleItemInstance.belongsTo(models.Package, { as: 'package', foreignKey: 'package_id' });
  };

  return SaleItemInstance as ModelClass<SaleItemInstance>;
};

export default SaleItemFactory;

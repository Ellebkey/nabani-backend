import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { UserInstance } from '@models/user.model';
import type { PackageInstance } from '@models/package.model';
import type { PaymentInstance } from '@models/payment.model';
import type { DeliveryDayInstance } from '@models/delivery-day.model';

export type SaleType = 'package' | 'consulta';
export type SaleBilling = 'mensual' | 'quincenal' | 'semanal' | 'diario';
export type SaleStatus = 'pendiente' | 'pagada';

/**
 * Sale — a package or consulta sold to a patient. Anchors the generated payment
 * installments (as 'payments') and delivery days (as 'deliveries'); its line items
 * (sale_item) link the packages sold. `created_by_id` is audit-only.
 */
export class SaleInstance extends BaseModelInstance<SaleInstance> {
  declare id: CreationOptional<string>;
  declare folio: CreationOptional<string | null>;
  declare patientId: ForeignKey<string>;
  declare packageId: CreationOptional<ForeignKey<string | null>>;
  declare type: SaleType;
  declare totalAmount: number;
  declare startDate: string;
  declare days: number;
  declare billing: SaleBilling;
  declare discount: CreationOptional<number>;
  declare paymentType: CreationOptional<string | null>;
  declare invoiceRequested: CreationOptional<boolean>;
  declare status: CreationOptional<SaleStatus>;
  declare createdById: CreationOptional<ForeignKey<string | null>>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare package?: NonAttribute<PackageInstance | null>;
  declare createdBy?: NonAttribute<UserInstance | null>;
  declare payments?: NonAttribute<PaymentInstance[]>;
  declare deliveries?: NonAttribute<DeliveryDayInstance[]>;
}

const SaleFactory = (sequelize: Sequelize): ModelClass<SaleInstance> => {
  SaleInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      folio: { type: DataTypes.STRING(40), allowNull: true },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      packageId: { field: 'package_id', type: DataTypes.UUID, allowNull: true },
      type: { type: DataTypes.STRING(20), allowNull: false },
      totalAmount: {
        field: 'total_amount', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      startDate: { field: 'start_date', type: DataTypes.DATEONLY, allowNull: false },
      days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      billing: { type: DataTypes.STRING(20), allowNull: false },
      discount: {
        type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      paymentType: { field: 'payment_type', type: DataTypes.STRING(30), allowNull: true },
      invoiceRequested: {
        field: 'invoice_requested', type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
      },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      createdById: { field: 'created_by_id', type: DataTypes.UUID, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'sale',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Sale',
      indexes: [
        { fields: ['patient_id'] },
        { fields: ['status'] },
      ],
    },
  );

  SaleInstance.associate = (models) => {
    SaleInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    SaleInstance.belongsTo(models.Package, { as: 'package', foreignKey: 'package_id' });
    SaleInstance.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by_id' });
    SaleInstance.hasMany(models.Payment, { as: 'payments', foreignKey: 'sale_id' });
    SaleInstance.hasMany(models.DeliveryDay, { as: 'deliveries', foreignKey: 'sale_id' });
    SaleInstance.belongsToMany(models.Package, {
      through: models.SaleItem,
      as: 'items',
      foreignKey: 'sale_id',
      otherKey: 'package_id',
    });
  };

  return SaleInstance as ModelClass<SaleInstance>;
};

export default SaleFactory;

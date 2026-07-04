import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { SaleInstance } from '@models/sale.model';
import type { DeliveryDayInstance } from '@models/delivery-day.model';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

/**
 * Payment — a scheduled installment for a sale (cobranza). `due_date` drives aging;
 * `paid`/`paid_at`/`method` are set when the pago is registered. Anchors the delivery
 * days (as 'deliveries') covered by this installment.
 */
export class PaymentInstance extends BaseModelInstance<PaymentInstance> {
  declare id: CreationOptional<string>;
  declare folio: CreationOptional<string | null>;
  declare saleId: ForeignKey<string>;
  declare patientId: ForeignKey<string>;
  declare dueDate: string;
  declare amount: number;
  declare method: CreationOptional<PaymentMethod | null>;
  declare paid: CreationOptional<boolean>;
  declare paidAt: CreationOptional<Date | null>;
  declare note: CreationOptional<string | null>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare sale?: NonAttribute<SaleInstance | null>;
  declare deliveries?: NonAttribute<DeliveryDayInstance[]>;
}

const PaymentFactory = (sequelize: Sequelize): ModelClass<PaymentInstance> => {
  PaymentInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      folio: { type: DataTypes.STRING(40), allowNull: true },
      saleId: { field: 'sale_id', type: DataTypes.UUID, allowNull: false },
      patientId: { field: 'patient_id', type: DataTypes.UUID, allowNull: false },
      dueDate: { field: 'due_date', type: DataTypes.DATEONLY, allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      method: { type: DataTypes.STRING(20), allowNull: true },
      paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      paidAt: { field: 'paid_at', type: DataTypes.DATE, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'payment',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Payment',
      indexes: [
        { fields: ['sale_id'] },
        { fields: ['patient_id'] },
        { fields: ['due_date'] },
        { fields: ['paid'] },
      ],
    },
  );

  PaymentInstance.associate = (models) => {
    PaymentInstance.belongsTo(models.Sale, { as: 'sale', foreignKey: 'sale_id' });
    PaymentInstance.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    PaymentInstance.hasMany(models.DeliveryDay, { as: 'deliveries', foreignKey: 'payment_id' });
  };

  return PaymentInstance as ModelClass<PaymentInstance>;
};

export default PaymentFactory;

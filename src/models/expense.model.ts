import {
  Sequelize, DataTypes, CreationOptional, ForeignKey, NonAttribute,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';
import type { BeneficiaryInstance } from '@models/beneficiary.model';
import type { EmployeeInstance } from '@models/employee.model';

export type ExpenseType = 'fijo' | 'variable' | 'nomina';

/**
 * Expense — clinic-wide financial outflow. `type=fijo|variable` links a Beneficiary
 * (vendor); `type=nomina` links an Employee instead. `created_by_id` is audit-only.
 */
export class ExpenseInstance extends BaseModelInstance<ExpenseInstance> {
  declare id: CreationOptional<string>;
  declare folio: CreationOptional<string | null>;
  declare beneficiaryId: CreationOptional<ForeignKey<string | null>>;
  declare concept: string;
  declare totalAmount: number;
  declare expenseDate: string;
  declare type: ExpenseType;
  declare employeeId: CreationOptional<ForeignKey<string | null>>;
  declare comments: CreationOptional<string | null>;
  declare createdById: CreationOptional<ForeignKey<string | null>>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
  declare beneficiary?: NonAttribute<BeneficiaryInstance | null>;
  declare employee?: NonAttribute<EmployeeInstance | null>;
}

const ExpenseFactory = (sequelize: Sequelize): ModelClass<ExpenseInstance> => {
  ExpenseInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      folio: { type: DataTypes.STRING(40), allowNull: true },
      beneficiaryId: { field: 'beneficiary_id', type: DataTypes.UUID, allowNull: true },
      concept: { type: DataTypes.STRING(200), allowNull: false },
      totalAmount: {
        field: 'total_amount', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      expenseDate: { field: 'expense_date', type: DataTypes.DATEONLY, allowNull: false },
      type: { type: DataTypes.STRING(20), allowNull: false },
      employeeId: { field: 'employee_id', type: DataTypes.UUID, allowNull: true },
      comments: { type: DataTypes.TEXT, allowNull: true },
      createdById: { field: 'created_by_id', type: DataTypes.UUID, allowNull: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'expense',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Expense',
      indexes: [
        { fields: ['expense_date'] },
        { fields: ['type'] },
        { fields: ['beneficiary_id'] },
        { fields: ['employee_id'] },
      ],
    },
  );

  ExpenseInstance.associate = (models) => {
    ExpenseInstance.belongsTo(models.Beneficiary, { as: 'beneficiary', foreignKey: 'beneficiary_id' });
    ExpenseInstance.belongsTo(models.Employee, { as: 'employee', foreignKey: 'employee_id' });
    ExpenseInstance.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by_id' });
  };

  return ExpenseInstance as ModelClass<ExpenseInstance>;
};

export default ExpenseFactory;

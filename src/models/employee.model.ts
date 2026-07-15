import {
  Sequelize, DataTypes, CreationOptional, ForeignKey,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

export type EmployeePosition = 'nutriologa' | 'admin' | 'cocina' | 'front_desk' | 'reparto';

/**
 * Employee — staff roster with quincenal salary used for the Nómina expense flow.
 * Optionally linked to a login User (user_id); nómina expenses reference the employee.
 */
export class EmployeeInstance extends BaseModelInstance<EmployeeInstance> {
  declare id: CreationOptional<string>;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare position: EmployeePosition;
  declare salaryQuincenal: number;
  declare lastPaymentDate: CreationOptional<string | null>;
  declare userId: CreationOptional<ForeignKey<string | null>>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const EmployeeFactory = (sequelize: Sequelize): ModelClass<EmployeeInstance> => {
  EmployeeInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      firstName: { field: 'first_name', type: DataTypes.STRING(80), allowNull: false },
      lastName: { field: 'last_name', type: DataTypes.STRING(80), allowNull: false },
      email: { type: DataTypes.STRING(120), allowNull: false },
      position: { type: DataTypes.STRING(20), allowNull: false },
      salaryQuincenal: {
        field: 'salary_quincenal', type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
      },
      lastPaymentDate: { field: 'last_payment_date', type: DataTypes.DATEONLY, allowNull: true },
      userId: { field: 'user_id', type: DataTypes.UUID, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'employee',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Employee',
      indexes: [
        { fields: ['user_id'] },
        { fields: ['active'] },
      ],
    },
  );

  EmployeeInstance.associate = (models) => {
    EmployeeInstance.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' });
    EmployeeInstance.hasMany(models.Expense, { as: 'payrollExpenses', foreignKey: 'employee_id' });
  };

  return EmployeeInstance as ModelClass<EmployeeInstance>;
};

export default EmployeeFactory;

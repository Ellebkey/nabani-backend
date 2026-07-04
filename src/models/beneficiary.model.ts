import { Sequelize, DataTypes, CreationOptional } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * Beneficiary — the expense company/vendor lookup. Auto-created/matched by name
 * when logging a non-nómina expense; feeds the beneficiary select in the form.
 */
export class BeneficiaryInstance extends BaseModelInstance<BeneficiaryInstance> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare createdAt: CreationOptional<string>;
}

const BeneficiaryFactory = (sequelize: Sequelize): ModelClass<BeneficiaryInstance> => {
  BeneficiaryInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'beneficiary',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      modelName: 'Beneficiary',
    },
  );

  BeneficiaryInstance.associate = (models) => {
    BeneficiaryInstance.hasMany(models.Expense, { as: 'expenses', foreignKey: 'beneficiary_id' });
  };

  return BeneficiaryInstance as ModelClass<BeneficiaryInstance>;
};

export default BeneficiaryFactory;

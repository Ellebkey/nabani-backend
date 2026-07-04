import { Sequelize, DataTypes, CreationOptional } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * Disease — clinical condition catalog (16 seed rows). Referenced by ingredients
 * ("no apto para") and by patients (their enfermedades → blue pills).
 */
export class DiseaseInstance extends BaseModelInstance<DiseaseInstance> {
  declare id: CreationOptional<string>;
  declare key: string;
  declare name: string;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const DiseaseFactory = (sequelize: Sequelize): ModelClass<DiseaseInstance> => {
  DiseaseInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      key: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'disease',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Disease',
    },
  );

  return DiseaseInstance as ModelClass<DiseaseInstance>;
};

export default DiseaseFactory;

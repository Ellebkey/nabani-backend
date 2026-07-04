import { Sequelize, DataTypes, CreationOptional } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * User Model
 */
export class UserInstance extends BaseModelInstance<UserInstance> {
  declare id: CreationOptional<string>;
  declare username: string;
  declare fullname: CreationOptional<string | null>;
  declare hashedPassword: string;
  declare email: string;
  declare mobileNumber: CreationOptional<string>;
  declare emailVerified: CreationOptional<boolean>;
  declare roles: CreationOptional<string[]>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const UserFactory = (sequelize: Sequelize): ModelClass<UserInstance> => {
  UserInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
        unique: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isUnique: async (value: string): Promise<void> => {
            const user = await UserInstance.findOne({
              where: { username: value },
            });
            if (user && user.username === value) {
              throw new Error('Ya existe un registro con este correo.');
            }
          },
        },
      },
      fullname: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hashedPassword: {
        field: 'hashed_password',
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mobileNumber: {
        field: 'mobile_number',
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerified: {
        field: 'email_verified',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      roles: {
        type: DataTypes.JSON,
        defaultValue: ['free'],
      },
      createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
      },
      updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      tableName: 'user',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'User',
    },
  );

  UserInstance.associate = () => {
    // Nabani domain associations (e.g. Employee, authored records) added in Phase 1.
  };

  return UserInstance as ModelClass<UserInstance>;
};

export default UserFactory;

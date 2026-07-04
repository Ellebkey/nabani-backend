import {
  Sequelize,
  DataTypes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * UserConfig Model
 */
export class UserConfigInstance extends BaseModelInstance<UserConfigInstance> {
  declare id: CreationOptional<number>;
  declare defaultAccount: string;
  declare userId: ForeignKey<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

const UserConfigFactory = (sequelize: Sequelize): ModelClass<UserConfigInstance> => {
  UserConfigInstance.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      defaultAccount: {
        field: 'default_account',
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      userId: {
        field: 'user_id',
        type: DataTypes.UUID,
        allowNull: false,
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
      tableName: 'user_config',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'UserConfig',
    },
  );

  UserConfigInstance.associate = (models) => {
    UserConfigInstance.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' });
  };

  return UserConfigInstance as ModelClass<UserConfigInstance>;
};

export default UserConfigFactory;

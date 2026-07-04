import {
  Sequelize,
  DataTypes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * API Key Model
 * A long-lived, revocable credential for programmatic access. Each key belongs
 * to a real user (`userId`) and carries `scopes` that bound what it may do.
 * Only the SHA-256 `keyHash` is persisted; the plaintext key is shown once at
 * creation and never stored.
 */
export class ApiKeyInstance extends BaseModelInstance<ApiKeyInstance> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<string>;
  declare name: string;
  declare keyPrefix: string;
  declare keyHash: string;
  declare scopes: CreationOptional<string[]>;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

const ApiKeyFactory = (sequelize: Sequelize): ModelClass<ApiKeyInstance> => {
  ApiKeyInstance.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        field: 'user_id',
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      keyPrefix: {
        field: 'key_prefix',
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      keyHash: {
        field: 'key_hash',
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      scopes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      lastUsedAt: {
        field: 'last_used_at',
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        field: 'expires_at',
        type: DataTypes.DATE,
        allowNull: true,
      },
      revokedAt: {
        field: 'revoked_at',
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: 'api_keys',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'ApiKey',
    },
  );

  ApiKeyInstance.associate = (models) => {
    ApiKeyInstance.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' });
  };

  return ApiKeyInstance as ModelClass<ApiKeyInstance>;
};

export default ApiKeyFactory;

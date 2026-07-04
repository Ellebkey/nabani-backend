import { Sequelize, DataTypes, CreationOptional } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * CalorieLevel — the dynamic kcal tiers (1300/1700/2000/2200/2500…). Menús del día
 * carry per-level portions; patients/plans reference their level.
 */
export class CalorieLevelInstance extends BaseModelInstance<CalorieLevelInstance> {
  declare id: CreationOptional<string>;
  declare kcal: number;
  declare label: string;
  declare sortOrder: CreationOptional<number>;
  declare active: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const CalorieLevelFactory = (sequelize: Sequelize): ModelClass<CalorieLevelInstance> => {
  CalorieLevelInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      kcal: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      label: { type: DataTypes.STRING(20), allowNull: false },
      sortOrder: { field: 'sort_order', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { field: 'created_at', type: DataTypes.DATE },
      updatedAt: { field: 'updated_at', type: DataTypes.DATE },
    },
    {
      sequelize,
      tableName: 'calorie_level',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'CalorieLevel',
    },
  );

  return CalorieLevelInstance as ModelClass<CalorieLevelInstance>;
};

export default CalorieLevelFactory;

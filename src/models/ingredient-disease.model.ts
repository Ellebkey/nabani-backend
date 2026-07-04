import { Sequelize, DataTypes, CreationOptional, ForeignKey } from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

/**
 * IngredientDisease — join: which diseases an ingredient is NOT suitable for
 * ("No apto para"). Drives disease-conflict flagging (blue) in menu resolution.
 */
export class IngredientDiseaseInstance extends BaseModelInstance<IngredientDiseaseInstance> {
  declare id: CreationOptional<string>;
  declare ingredientId: ForeignKey<string>;
  declare diseaseId: ForeignKey<string>;
}

const IngredientDiseaseFactory = (sequelize: Sequelize): ModelClass<IngredientDiseaseInstance> => {
  IngredientDiseaseInstance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        allowNull: false,
        primaryKey: true,
      },
      ingredientId: { field: 'ingredient_id', type: DataTypes.UUID, allowNull: false },
      diseaseId: { field: 'disease_id', type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      tableName: 'ingredient_disease',
      underscored: true,
      timestamps: false,
      modelName: 'IngredientDisease',
      indexes: [{ unique: true, fields: ['ingredient_id', 'disease_id'] }],
    },
  );

  return IngredientDiseaseInstance as ModelClass<IngredientDiseaseInstance>;
};

export default IngredientDiseaseFactory;

import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import type { DbModels } from '@interfaces/sequelize.interface';

/**
 * Base Model Instance class that all Sequelize models should extend
 * Provides TypeScript support with InferAttributes and InferCreationAttributes
 *
 * @template T - The model class that extends this base
 */
export class BaseModelInstance<T extends BaseModelInstance<T>> extends Model<
  InferAttributes<T>,
  InferCreationAttributes<T>
> {
  static associate?: (models: DbModels) => void;
}

/**
 * Type for model factory functions
 * All model factories should return this type
 */
export type ModelFactory<T extends BaseModelInstance<T>> = (
  sequelize: Sequelize,
) => typeof BaseModelInstance & (new () => T) & {
  associate?: (models: DbModels) => void;
};

/**
 * Type helper for model class with static methods
 * Use this when you need to reference the model class itself
 */
export type ModelClass<T extends BaseModelInstance<T>> = typeof BaseModelInstance
  & (new () => T) & {
    associate?: (models: DbModels) => void;
  };

import { Sequelize, BuildOptions, Model } from 'sequelize';
import { ModelClass } from '@models/base.model';
import { UserInstance } from '@models/user.model';
import { UserConfigInstance } from '@models/user-config.model';
import { ApiKeyInstance } from '@models/api-key.model';
// --- Nabani domain instance types (Phase 1) ---
import { DiseaseInstance } from '@models/disease.model';
import { CalorieLevelInstance } from '@models/calorie-level.model';
import { IngredientInstance } from '@models/ingredient.model';
import { IngredientDiseaseInstance } from '@models/ingredient-disease.model';

/**
 * Interface for the database models collection
 * Used for typing the models parameter in associate functions and sequelize configuration
 */
export interface DbModels {
  sequelize: Sequelize;
  User: ModelClass<UserInstance>;
  UserConfig: ModelClass<UserConfigInstance>;
  ApiKey: ModelClass<ApiKeyInstance>;
  // --- Nabani domain models (Phase 1) ---
  Disease: ModelClass<DiseaseInstance>;
  CalorieLevel: ModelClass<CalorieLevelInstance>;
  Ingredient: ModelClass<IngredientInstance>;
  IngredientDisease: ModelClass<IngredientDiseaseInstance>;
}

export type ModelStatic = typeof Model
  & { associate: (models: DbModels) => void }
  & { new(values?: Record<string, unknown>, options?: BuildOptions): Model };

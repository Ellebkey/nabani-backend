import { Sequelize, BuildOptions, Model } from 'sequelize';
import { ModelClass } from '@models/base.model';
import { UserInstance } from '@models/user.model';
import { UserConfigInstance } from '@models/user-config.model';
import { ApiKeyInstance } from '@models/api-key.model';
// --- Nabani domain instance types are imported here as each model is implemented (Phase 1) ---

/**
 * Interface for the database models collection
 * Used for typing the models parameter in associate functions and sequelize configuration
 */
export interface DbModels {
  sequelize: Sequelize;
  User: ModelClass<UserInstance>;
  UserConfig: ModelClass<UserConfigInstance>;
  ApiKey: ModelClass<ApiKeyInstance>;
  // --- Nabani domain models added here as implemented (Phase 1) ---
}

export type ModelStatic = typeof Model
  & { associate: (models: DbModels) => void }
  & { new(values?: Record<string, unknown>, options?: BuildOptions): Model };

import { Sequelize } from 'sequelize';
import UserFactory from '@models/user.model';
import UserConfigFactory from '@models/user-config.model';
import ApiKeyFactory from '@models/api-key.model';
// --- Nabani domain models are registered below as each is implemented (Phase 1) ---
import { DbModels, ModelStatic } from '@interfaces/sequelize.interface';
import envConfig from './config';
import { logger } from './logger';

// Populated by initDataBase() at boot, before any request handling; typed as
// complete so consumers never null-check individual models
export const db = {} as DbModels;

export class SequelizeDB {
  db: string;
  user: string;
  password: string;
  host: string;
  port: number;
  maxPool: number;
  minPool: number;

  constructor() {
    this.db = envConfig.sql.db;
    this.user = envConfig.sql.user;
    this.password = envConfig.sql.password;
    this.host = envConfig.sql.host;
    this.port = +envConfig.sql.port;
    this.maxPool = +envConfig.MAX_POOL || 10;
    this.minPool = +envConfig.MIN_POOL || 1;
  }

  initDataBase = async (): Promise<void> => {
    try {
      logger.info('Initializing PostgreSQL Database');
      const isProduction = envConfig.env === 'production' || envConfig.env === 'stage';

      const sequelize = new Sequelize(this.db, this.user, this.password, {
        host: this.host,
        dialect: 'postgres',
        port: this.port,
        logging: (msg) => logger.verbose(msg),
        pool: {
          max: this.maxPool,
          min: this.minPool,
          acquire: 30000,
          idle: 10000,
        },
        ...(isProduction && {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }),
      });

      db.sequelize = sequelize;
      db.User = UserFactory(sequelize);
      db.UserConfig = UserConfigFactory(sequelize);
      db.ApiKey = ApiKeyFactory(sequelize);
      // --- Nabani domain models registered here as implemented (Phase 1) ---

      Object.keys(db)
        .forEach((modelName) => {
          const model = db[modelName as keyof DbModels];
          if (model && typeof model !== 'undefined' && model !== db.sequelize) {
            const modelStatic = model as ModelStatic;
            if (modelStatic.associate) {
              modelStatic.associate(db);
            }
          }
        });

      await sequelize.authenticate();
      logger.info('Connection has been established successfully.');
      await sequelize.sync();
      logger.info('PostgreSQL Database synchronized');
    } catch (e) {
      logger.error('Unable to connect to the database:', e);
    }
  };
}

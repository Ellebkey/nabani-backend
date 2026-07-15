import { Sequelize } from 'sequelize';
import UserFactory from '@models/user.model';
import UserConfigFactory from '@models/user-config.model';
import ApiKeyFactory from '@models/api-key.model';
// --- Nabani domain models (Phase 1) ---
// Group A — catalog & clinical reference
import DiseaseFactory from '@models/disease.model';
import CalorieLevelFactory from '@models/calorie-level.model';
import IngredientFactory from '@models/ingredient.model';
import IngredientDiseaseFactory from '@models/ingredient-disease.model';
// Group B — dishes & menu templates
import DishFactory from '@models/dish.model';
import DishIngredientFactory from '@models/dish-ingredient.model';
import DishIngredientPortionFactory from '@models/dish-ingredient-portion.model';
import MenuDayFactory from '@models/menu-day.model';
import MenuDayMealFactory from '@models/menu-day-meal.model';
// Group C — patients & clinical records
import PatientFactory from '@models/patient.model';
import PatientAddressFactory from '@models/patient-address.model';
import NutritionPlanFactory from '@models/nutrition-plan.model';
import PatientDiseaseFactory from '@models/patient-disease.model';
import PatientPreferenceFactory from '@models/patient-preference.model';
import ConsultationFactory from '@models/consultation.model';
// Group E — finance & staff
import BeneficiaryFactory from '@models/beneficiary.model';
import EmployeeFactory from '@models/employee.model';
import ExpenseFactory from '@models/expense.model';
// Group D — packages, sales, payments, delivery/production
import PackageFactory from '@models/package.model';
import SaleFactory from '@models/sale.model';
import SaleItemFactory from '@models/sale-item.model';
import PaymentFactory from '@models/payment.model';
import DeliveryDayFactory from '@models/delivery-day.model';
import DeliveryMealFactory from '@models/delivery-meal.model';
import DeliveryMealIngredientFactory from '@models/delivery-meal-ingredient.model';
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
      // --- Nabani domain models (Phase 1) ---
      // Group A — catalog & clinical reference
      db.Disease = DiseaseFactory(sequelize);
      db.CalorieLevel = CalorieLevelFactory(sequelize);
      db.Ingredient = IngredientFactory(sequelize);
      db.IngredientDisease = IngredientDiseaseFactory(sequelize);
      // Group B — dishes & menu templates
      db.Dish = DishFactory(sequelize);
      db.DishIngredient = DishIngredientFactory(sequelize);
      db.DishIngredientPortion = DishIngredientPortionFactory(sequelize);
      db.MenuDay = MenuDayFactory(sequelize);
      db.MenuDayMeal = MenuDayMealFactory(sequelize);
      // Group C — patients & clinical records
      db.Patient = PatientFactory(sequelize);
      db.PatientAddress = PatientAddressFactory(sequelize);
      db.NutritionPlan = NutritionPlanFactory(sequelize);
      db.PatientDisease = PatientDiseaseFactory(sequelize);
      db.PatientPreference = PatientPreferenceFactory(sequelize);
      db.Consultation = ConsultationFactory(sequelize);
      // Group E — finance & staff
      db.Beneficiary = BeneficiaryFactory(sequelize);
      db.Employee = EmployeeFactory(sequelize);
      db.Expense = ExpenseFactory(sequelize);
      // Group D — packages, sales, payments, delivery/production
      db.Package = PackageFactory(sequelize);
      db.Sale = SaleFactory(sequelize);
      db.SaleItem = SaleItemFactory(sequelize);
      db.Payment = PaymentFactory(sequelize);
      db.DeliveryDay = DeliveryDayFactory(sequelize);
      db.DeliveryMeal = DeliveryMealFactory(sequelize);
      db.DeliveryMealIngredient = DeliveryMealIngredientFactory(sequelize);

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
      // sync() is the schema mechanism — a booted app without a synced DB would
      // pass the deploy health check while every real endpoint fails.
      if (envConfig.env === 'production' || envConfig.env === 'stage') {
        process.exit(1);
      }
    }
  };
}

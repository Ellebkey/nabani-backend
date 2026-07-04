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
// Group B — dishes & menu templates
import { DishInstance } from '@models/dish.model';
import { DishIngredientInstance } from '@models/dish-ingredient.model';
import { DishIngredientPortionInstance } from '@models/dish-ingredient-portion.model';
import { MenuDayInstance } from '@models/menu-day.model';
import { MenuDayMealInstance } from '@models/menu-day-meal.model';
// Group C — patients & clinical records
import { PatientInstance } from '@models/patient.model';
import { PatientAddressInstance } from '@models/patient-address.model';
import { NutritionPlanInstance } from '@models/nutrition-plan.model';
import { PatientDiseaseInstance } from '@models/patient-disease.model';
import { PatientPreferenceInstance } from '@models/patient-preference.model';
import { ConsultationInstance } from '@models/consultation.model';
// Group E — finance & staff
import { BeneficiaryInstance } from '@models/beneficiary.model';
import { EmployeeInstance } from '@models/employee.model';
import { ExpenseInstance } from '@models/expense.model';
// Group D — packages, sales, payments, delivery/production
import { PackageInstance } from '@models/package.model';
import { SaleInstance } from '@models/sale.model';
import { SaleItemInstance } from '@models/sale-item.model';
import { PaymentInstance } from '@models/payment.model';
import { DeliveryDayInstance } from '@models/delivery-day.model';
import { DeliveryMealInstance } from '@models/delivery-meal.model';
import { DeliveryMealIngredientInstance } from '@models/delivery-meal-ingredient.model';

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
  // Group B — dishes & menu templates
  Dish: ModelClass<DishInstance>;
  DishIngredient: ModelClass<DishIngredientInstance>;
  DishIngredientPortion: ModelClass<DishIngredientPortionInstance>;
  MenuDay: ModelClass<MenuDayInstance>;
  MenuDayMeal: ModelClass<MenuDayMealInstance>;
  // Group C — patients & clinical records
  Patient: ModelClass<PatientInstance>;
  PatientAddress: ModelClass<PatientAddressInstance>;
  NutritionPlan: ModelClass<NutritionPlanInstance>;
  PatientDisease: ModelClass<PatientDiseaseInstance>;
  PatientPreference: ModelClass<PatientPreferenceInstance>;
  Consultation: ModelClass<ConsultationInstance>;
  // Group E — finance & staff
  Beneficiary: ModelClass<BeneficiaryInstance>;
  Employee: ModelClass<EmployeeInstance>;
  Expense: ModelClass<ExpenseInstance>;
  // Group D — packages, sales, payments, delivery/production
  Package: ModelClass<PackageInstance>;
  Sale: ModelClass<SaleInstance>;
  SaleItem: ModelClass<SaleItemInstance>;
  Payment: ModelClass<PaymentInstance>;
  DeliveryDay: ModelClass<DeliveryDayInstance>;
  DeliveryMeal: ModelClass<DeliveryMealInstance>;
  DeliveryMealIngredient: ModelClass<DeliveryMealIngredientInstance>;
}

export type ModelStatic = typeof Model
  & { associate: (models: DbModels) => void }
  & { new(values?: Record<string, unknown>, options?: BuildOptions): Model };

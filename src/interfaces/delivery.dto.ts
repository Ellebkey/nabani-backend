import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { PatientRefDto } from '@interfaces/refs.dto';
import type { PackageRefDto } from '@interfaces/package.dto';
import type { DeliveryType } from '@models/delivery-day.model';
import type { MealSlot } from '@models/delivery-meal.model';
import type { ConflictType } from '@models/delivery-meal-ingredient.model';

/** Lightweight menú del día reference embedded in delivery days. */
export interface MenuDayRefDto {
  id: string;
  menuDate: string;
  status: string;
}

/** Lightweight dish reference embedded in delivery meals. */
export interface DishRefDto {
  id: string;
  name: string;
}

/** Lightweight ingredient reference embedded in delivery meal ingredients. */
export interface IngredientRefDto {
  id: string;
  name: string;
  baseQuantity?: number;
  baseUnit?: string;
}

export interface DeliveryMealIngredientDto {
  id: string;
  ingredientId: string;
  ingredient?: IngredientRefDto | null;
  portions: number;
  conflictType: ConflictType | null;
  substitutedFromIngredientId: string | null;
  substitutedFrom?: IngredientRefDto | null;
  eliminated: boolean;
  position: number;
}

export interface DeliveryMealDto {
  id: string;
  deliveryDayId: string;
  mealSlot: MealSlot;
  dishId: string | null;
  dish?: DishRefDto | null;
  included: boolean;
  ingredients?: DeliveryMealIngredientDto[];
  createdAt?: string;
}

export interface DeliveryDayDto {
  id: string;
  patientId: string;
  saleId: string | null;
  paymentId: string | null;
  packageId: string | null;
  menuDayId: string | null;
  deliveryDate: string;
  amount: number;
  type: DeliveryType;
  hasMenu: boolean;
  authorized: boolean;
  status: string | null;
  patient?: PatientRefDto | null;
  package?: PackageRefDto | null;
  menuDay?: MenuDayRefDto | null;
  meals?: DeliveryMealDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateDeliveryDayDto {
  deliveryDate?: string;
  amount?: number;
  type?: DeliveryType;
  menuDayId?: string | null;
  hasMenu?: boolean;
  authorized?: boolean;
  status?: string | null;
}

/** Building-block input for generating the delivery days of a sale/payment span. */
export interface DeliveryDayInput {
  patientId: string;
  deliveryDate: string;
  type: DeliveryType;
  saleId?: string | null;
  paymentId?: string | null;
  packageId?: string | null;
  menuDayId?: string | null;
  amount?: number;
  hasMenu?: boolean;
  authorized?: boolean;
  status?: string | null;
}

export interface DeliveryDayFilterDto extends BaseFilterDto {
  patientId?: string;
  date?: string;
  authorized?: boolean;
  type?: DeliveryType;
}

export type DeliveryDayListDto = BaseListDto<DeliveryDayDto>;

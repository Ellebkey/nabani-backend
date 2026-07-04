import type { PatientRefDto } from '@interfaces/refs.dto';
import type { MealSlot } from '@models/delivery-meal.model';

/* ------------------------------------------------------------------ *
 *  GET /production-map  — the dense nb-map grid                       *
 * ------------------------------------------------------------------ */

/** One column of the production map (a single ingredient within a dish/slot). */
export interface ProductionColumnDto {
  /** Stable cell key: `${mealSlot}::${dishId}::${ingredientId}`. */
  key: string;
  mealSlot: MealSlot;
  dishId: string | null;
  dishName: string | null;
  ingredientId: string;
  ingredientName: string;
  foodGroup: string;
  baseQuantity: number;
  unit: string;
}

/** Header hierarchy: meal slot → dishes → ingredient columns. */
export interface ProductionMealGroupDto {
  mealSlot: MealSlot;
  dishes: {
    dishId: string | null;
    dishName: string | null;
    columns: ProductionColumnDto[];
  }[];
}

/** One cell value for a (patient, column) pair. */
export interface ProductionCellDto {
  portions: number;
  eliminated: boolean;
  /** True when the patient had this ingredient swapped for another. */
  substituted: boolean;
  substituteId: string | null;
  substituteName: string | null;
}

export interface ProductionRowDto {
  deliveryDayId: string;
  patient: PatientRefDto;
  kcal: number | null;
  calorieLabel: string | null;
  authorized: boolean;
  /** Keyed by column.key; missing key = meal not in package (render blank). */
  cells: Record<string, ProductionCellDto>;
}

export interface KitchenTotalDto {
  ingredientId: string;
  name: string;
  foodGroup: string;
  baseUnit: string;
  baseQuantity: number;
  portions: number;
}

export interface ProductionMapDto {
  date: string;
  columns: ProductionColumnDto[];
  mealGroups: ProductionMealGroupDto[];
  rows: ProductionRowDto[];
  totalsForKitchen: KitchenTotalDto[];
  patientCount: number;
}

/* ------------------------------------------------------------------ *
 *  GET /delivery-labels                                              *
 * ------------------------------------------------------------------ */

export interface DeliveryLabelMealDto {
  mealSlot: MealSlot;
  dishName: string | null;
  ingredients: {
    name: string;
    portions: number;
    substituted: boolean;
    substitutedFromName: string | null;
    eliminated: boolean;
  }[];
}

export interface DeliveryLabelDto {
  deliveryDayId: string;
  patient: PatientRefDto;
  zone: string | null;
  tuppers: boolean;
  calorieLabel: string | null;
  meals: DeliveryLabelMealDto[];
  substitutions: { mealSlot: MealSlot; from: string; to: string }[];
  freeBeverages: string | null;
}

export interface DeliveryLabelsDto {
  date: string;
  rows: DeliveryLabelDto[];
  count: number;
}

/* ------------------------------------------------------------------ *
 *  GET /kitchen-view                                                 *
 * ------------------------------------------------------------------ */

export interface KitchenExceptionDto {
  patientName: string;
  type: 'substitution' | 'elimination';
  ingredientName: string;
  substituteName: string | null;
  dishName: string | null;
}

export interface KitchenSlotDto {
  mealSlot: MealSlot;
  dishes: {
    dishId: string | null;
    dishName: string | null;
    patientCount: number;
    ingredients: {
      ingredientId: string;
      name: string;
      baseQuantity: number;
      unit: string;
      totalPortions: number;
    }[];
  }[];
  exceptions: KitchenExceptionDto[];
}

export interface KitchenViewDto {
  date: string;
  slots: KitchenSlotDto[];
}

/* ------------------------------------------------------------------ *
 *  GET /shopping-list                                               *
 * ------------------------------------------------------------------ */

export interface ShoppingListItemDto {
  ingredientId: string;
  name: string;
  foodGroup: string;
  portions: number;
  baseQuantity: number;
  unit: string;
  /** Σ(portions × baseQuantity) converted to kg (gr/ml) or pzas. */
  quantity: number;
  quantityUnit: 'kg' | 'l' | 'pzas';
  lastPrice: number | null;
  cost: number;
}

export interface ShoppingListGroupDto {
  foodGroup: string;
  items: ShoppingListItemDto[];
  subtotal: number;
}

export interface CostPerDishDto {
  dishId: string;
  dishName: string | null;
  portions: number;
  totalCost: number;
  costPerPortion: number;
}

export interface MarginPerPackageDto {
  packageId: string;
  code: string;
  displayLabel: string;
  pricePerDay: number;
  deliveries: number;
  costPerDay: number;
  margin: number;
  marginPercent: number;
  alert: boolean;
}

export interface ShoppingListDto {
  startDate: string;
  endDate: string;
  groups: ShoppingListGroupDto[];
  estimated: number;
  costPerDish: CostPerDishDto[];
  marginPerPackage: MarginPerPackageDto[];
}

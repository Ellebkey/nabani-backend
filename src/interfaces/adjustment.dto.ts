import type { PatientRefDto } from '@interfaces/refs.dto';
import type { PackageRefDto } from '@interfaces/package.dto';
import type { MealSlot } from '@models/delivery-meal.model';
import type { ConflictType } from '@models/delivery-meal-ingredient.model';

/** Summary returned by applying a menú del día to every patient of that date. */
export interface ApplyMenuSummaryDto {
  date: string;
  menuDayId: string;
  /** Patients whose delivery got a resolved menu materialized. */
  applied: number;
  /** 0 preference conflicts → can auto-authorize. */
  autoReady: number;
  /** > 0 preference conflicts → need nutrióloga review. */
  withConflicts: number;
  /** Patients that have at least one disease (blue) flag (informational). */
  withDiseaseFlags: number;
}

export type AdjustmentStatus = 'listo' | 'conflicto';
export type AdjustmentFilter = 'todos' | 'conflictos' | 'listos';

export interface CalorieLevelRefDto {
  id: string;
  kcal: number;
  label: string;
}

/** One row of the ajustes queue (GET /adjustments?date=). */
export interface AdjustmentQueueItemDto {
  deliveryDayId: string;
  patient: PatientRefDto;
  calorieLevel: CalorieLevelRefDto | null;
  package: PackageRefDto | null;
  hasMenu: boolean;
  authorized: boolean;
  conflictCount: number;
  preferenceConflictCount: number;
  diseaseConflictCount: number;
  status: AdjustmentStatus;
}

export interface AdjustmentQueueDto {
  date: string;
  rows: AdjustmentQueueItemDto[];
  count: number;
  summary: { total: number; listos: number; conflictos: number };
}

/** Flat ingredient row shaped exactly for the ajustes UI table. */
export interface AdjustmentMealIngredientDto {
  id: string;
  ingredientId: string;
  name: string;
  portions: number;
  conflictType: ConflictType | null;
  /** Name of the original ingredient when this row is a substitution. */
  substitutedFrom: string | null;
  eliminated: boolean;
  position: number;
  /** Catalog gramaje (base quantity/unit); null when the catalog has none. */
  quantity: number | null;
  unit: string | null;
}

export interface AdjustmentMealDto {
  id: string;
  mealSlot: MealSlot;
  dishId: string | null;
  dishName: string | null;
  included: boolean;
  ingredients: AdjustmentMealIngredientDto[];
}

/** Detail pane for one delivery (GET /adjustments/:deliveryDayId). */
export interface AdjustmentDetailDto {
  deliveryDayId: string;
  patient: PatientRefDto;
  calorieLevel: CalorieLevelRefDto | null;
  week: string | null;
  package: PackageRefDto | null;
  hasMenu: boolean;
  authorized: boolean;
  status: AdjustmentStatus;
  conflictCount: number;
  preferenceConflictCount: number;
  diseaseConflictCount: number;
  diseases: { id: string; name: string }[];
  preferences: { id: string; name: string }[];
  meals: AdjustmentMealDto[];
}

/** Candidate ingredient for the swap modal ("Equivalentes sugeridos"). */
export interface SwapSuggestionDto {
  ingredientId: string;
  name: string;
  foodGroup: string;
  quantity: number | null;
  unit: string | null;
}

export interface SwapDto {
  deliveryMealIngredientId: string;
  newIngredientId: string;
}

export interface EliminateDto {
  deliveryMealIngredientId: string;
}

export interface AuthorizeDto {
  deliveryDayIds: string[];
}

export interface AuthorizeResultDto {
  authorized: number;
}

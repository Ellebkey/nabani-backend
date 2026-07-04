import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { MealTime } from '@models/dish.model';
import type { FoodGroup, Unit } from '@models/ingredient.model';

export interface IngredientRefDto {
  id: string;
  name: string;
  foodGroup: FoodGroup;
  baseUnit: Unit;
}

export interface CalorieLevelRefDto {
  id: string;
  kcal: number;
  label: string;
}

export interface CreateDishIngredientPortionDto {
  calorieLevelId: string;
  portions: number;
}

export interface CreateDishIngredientDto {
  ingredientId: string;
  baseQuantity: number;
  unit: Unit;
  position?: number;
  portions?: CreateDishIngredientPortionDto[];
}

export interface CreateDishDto {
  name: string;
  mealTime: MealTime;
  ingredients?: CreateDishIngredientDto[];
}

export interface UpdateDishDto {
  name?: string;
  mealTime?: MealTime;
  active?: boolean;
  /** When provided, replaces the full nested ingredient/portion set. */
  ingredients?: CreateDishIngredientDto[];
}

export interface DishIngredientPortionDto {
  id: string;
  calorieLevelId: string;
  calorieLevel: CalorieLevelRefDto | null;
  portions: number;
}

export interface DishIngredientDto {
  id: string;
  ingredientId: string;
  ingredient: IngredientRefDto | null;
  baseQuantity: number;
  unit: Unit;
  position: number;
  portions: DishIngredientPortionDto[];
}

export interface DishDto {
  id: string;
  name: string;
  mealTime: MealTime;
  usageCount: number;
  active: boolean;
  ingredients: DishIngredientDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DishFilterDto extends BaseFilterDto {
  mealTime?: MealTime;
  active?: boolean;
}

export type DishListDto = BaseListDto<DishDto>;

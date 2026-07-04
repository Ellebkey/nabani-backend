import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { FoodGroup, Unit } from '@models/ingredient.model';

export interface DiseaseRefDto {
  id: string;
  key: string;
  name: string;
}

export interface CreateIngredientDto {
  name: string;
  foodGroup: FoodGroup;
  baseUnit: Unit;
  baseQuantity: number;
  lastPrice?: number | null;
  /** Diseases this ingredient is NOT suitable for ("No apto para"). */
  diseaseIds?: string[];
}

export interface UpdateIngredientDto {
  name?: string;
  foodGroup?: FoodGroup;
  baseUnit?: Unit;
  baseQuantity?: number;
  lastPrice?: number | null;
  active?: boolean;
  diseaseIds?: string[];
}

export interface IngredientDto {
  id: string;
  name: string;
  foodGroup: FoodGroup;
  baseUnit: Unit;
  baseQuantity: number;
  lastPrice: number | null;
  active: boolean;
  diseases: DiseaseRefDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IngredientFilterDto extends BaseFilterDto {
  foodGroup?: FoodGroup;
  diseaseId?: string;
  active?: boolean;
}

export type IngredientListDto = BaseListDto<IngredientDto>;

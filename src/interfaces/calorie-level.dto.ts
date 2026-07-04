import { BaseListDto } from '@interfaces/base.dto';

export interface CreateCalorieLevelDto {
  kcal: number;
  label: string;
  sortOrder?: number;
}

export interface UpdateCalorieLevelDto {
  kcal?: number;
  label?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface CalorieLevelDto {
  id: string;
  kcal: number;
  label: string;
  sortOrder: number;
  active: boolean;
}

export type CalorieLevelListDto = BaseListDto<CalorieLevelDto>;

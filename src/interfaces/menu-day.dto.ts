import { BaseListDto, DateRangeFilterDto, PaginationDto } from '@interfaces/base.dto';
import type { MenuDayStatus } from '@models/menu-day.model';
import type { MealSlot } from '@models/menu-day-meal.model';
import type { MealTime } from '@models/dish.model';
import type { DishDto } from '@interfaces/dish.dto';

export interface DishRefDto {
  id: string;
  name: string;
  mealTime: MealTime;
  active: boolean;
}

export interface CreateMenuDayMealDto {
  mealSlot: MealSlot;
  dishId?: string | null;
  position?: number;
}

export interface CreateMenuDayDto {
  menuDate: string;
  status?: MenuDayStatus;
  meals?: CreateMenuDayMealDto[];
}

export interface UpdateMenuDayDto {
  menuDate?: string;
  status?: MenuDayStatus;
  /** When provided, replaces the full meal-slot set. */
  meals?: CreateMenuDayMealDto[];
}

export interface MenuDayMealDto {
  id: string;
  mealSlot: MealSlot;
  dishId: string | null;
  /** Light ref in list views; the FULL dish (ingredients + per-level portions)
   *  when fetched via findById/findByDate — the Menú-del-día editor needs it. */
  dish: DishRefDto | DishDto | null;
  position: number;
}

export interface MenuDayDto {
  id: string;
  menuDate: string;
  status: MenuDayStatus;
  createdById: string | null;
  meals: MenuDayMealDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuDayFilterDto extends DateRangeFilterDto, PaginationDto {
  status?: MenuDayStatus;
}

export type MenuDayListDto = BaseListDto<MenuDayDto>;

import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import { DiseaseRefDto } from '@interfaces/ingredient.dto';
import type { PatientWeek, PatientStatus } from '@models/patient.model';

export interface CalorieLevelRefDto {
  id: string;
  kcal: number;
  label: string;
}

export interface IngredientRefDto {
  id: string;
  name: string;
}

export interface NutriologaRefDto {
  id: string;
  fullname: string | null;
  username: string;
}

export interface PatientAddressDto {
  street: string | null;
  numberExt: string | null;
  numberInt: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
}

export interface NutritionPlanDto {
  calorieLevelId: string | null;
  verduras: number | null;
  frutas: number | null;
  cereales: number | null;
  lacteos: number | null;
  pDesayuno: number | null;
  pComida: number | null;
  pCena: number | null;
  aceites: number | null;
  semillas: number | null;
  comments: string | null;
}

export interface PatientAddressInputDto {
  street?: string | null;
  numberExt?: string | null;
  numberInt?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface NutritionPlanInputDto {
  calorieLevelId?: string | null;
  verduras?: number | null;
  frutas?: number | null;
  cereales?: number | null;
  lacteos?: number | null;
  pDesayuno?: number | null;
  pComida?: number | null;
  pCena?: number | null;
  aceites?: number | null;
  semillas?: number | null;
  comments?: string | null;
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  email?: string | null;
  cellphone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  week?: PatientWeek | null;
  zone?: string | null;
  tuppers?: boolean;
  otherFood?: string | null;
  otherDiseases?: string | null;
  otherPreferences?: string | null;
  calorieLevelId?: string | null;
  nutriologaId?: string | null;
  address?: PatientAddressInputDto | null;
  nutritionPlan?: NutritionPlanInputDto | null;
  diseaseIds?: string[];
  preferenceIngredientIds?: string[];
}

export interface UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  cellphone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  week?: PatientWeek | null;
  zone?: string | null;
  tuppers?: boolean;
  otherFood?: string | null;
  otherDiseases?: string | null;
  otherPreferences?: string | null;
  calorieLevelId?: string | null;
  nutriologaId?: string | null;
  address?: PatientAddressInputDto | null;
  nutritionPlan?: NutritionPlanInputDto | null;
  diseaseIds?: string[];
  preferenceIngredientIds?: string[];
}

export interface UpdatePatientStatusDto {
  status: PatientStatus;
}

/** Row shape for GET /patients (list). Nested clinical data lives on the detail DTO. */
export interface PatientListItemDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  cellphone: string | null;
  gender: string | null;
  birthday: string | null;
  week: PatientWeek | null;
  zone: string | null;
  tuppers: boolean;
  status: PatientStatus;
  calorieLevelId: string | null;
  nutriologaId: string | null;
  calorieLevel: CalorieLevelRefDto | null;
  /** Package/delivery summary is Group D — left null here. */
  packageSummary: null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientDto extends PatientListItemDto {
  otherFood: string | null;
  otherDiseases: string | null;
  otherPreferences: string | null;
  nutriologa: NutriologaRefDto | null;
  address: PatientAddressDto | null;
  nutritionPlan: NutritionPlanDto | null;
  diseases: DiseaseRefDto[];
  preferences: IngredientRefDto[];
}

export interface PatientFilterDto extends BaseFilterDto {
  status?: PatientStatus;
  /** Filter to patients whose package is about to expire (needs Group D data). */
  porVencer?: boolean;
}

export type PatientListDto = BaseListDto<PatientListItemDto>;

import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';

export interface CreatePackageDto {
  displayLabel: string;
  code: string;
  pricePerDay: number;
  consultPrice?: number | null;
  monthDiscount?: number;
  coupleDiscount?: number;
  especialDiscount?: number;
  includesDesayuno?: boolean;
  includesSnack1?: boolean;
  includesComida?: boolean;
  includesSnack2?: boolean;
  includesCena?: boolean;
}

export interface UpdatePackageDto {
  displayLabel?: string;
  code?: string;
  pricePerDay?: number;
  consultPrice?: number | null;
  monthDiscount?: number;
  coupleDiscount?: number;
  especialDiscount?: number;
  includesDesayuno?: boolean;
  includesSnack1?: boolean;
  includesComida?: boolean;
  includesSnack2?: boolean;
  includesCena?: boolean;
  active?: boolean;
}

export interface PackageDto {
  id: string;
  displayLabel: string;
  code: string;
  pricePerDay: number;
  consultPrice: number | null;
  monthDiscount: number;
  coupleDiscount: number;
  especialDiscount: number;
  includesDesayuno: boolean;
  includesSnack1: boolean;
  includesComida: boolean;
  includesSnack2: boolean;
  includesCena: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Lightweight package reference embedded in sales/deliveries. */
export interface PackageRefDto {
  id: string;
  code: string;
  displayLabel: string;
  pricePerDay: number;
}

export interface PackageFilterDto extends BaseFilterDto {
  active?: boolean;
}

export type PackageListDto = BaseListDto<PackageDto>;

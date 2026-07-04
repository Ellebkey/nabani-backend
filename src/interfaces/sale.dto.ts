import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { PatientRefDto, UserRefDto } from '@interfaces/refs.dto';
import type { PackageRefDto } from '@interfaces/package.dto';
import type { PaymentDto } from '@interfaces/payment.dto';
import type { DeliveryDayDto } from '@interfaces/delivery.dto';
import type { SaleType, SaleBilling, SaleStatus } from '@models/sale.model';

export interface CreateSaleItemDto {
  packageId: string;
  quantity: number;
  unitPrice: number;
  /** Optional; defaults to quantity × unitPrice when omitted. */
  subTotal?: number;
}

export interface CreateSaleDto {
  folio?: string | null;
  patientId: string;
  packageId?: string | null;
  type: SaleType;
  totalAmount: number;
  startDate: string;
  days: number;
  billing: SaleBilling;
  discount?: number;
  paymentType?: string | null;
  invoiceRequested?: boolean;
  status?: SaleStatus;
  items?: CreateSaleItemDto[];
}

export interface SaleItemDto {
  id: string;
  packageId: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  package?: PackageRefDto | null;
}

export interface SaleDto {
  id: string;
  folio: string | null;
  patientId: string;
  packageId: string | null;
  type: SaleType;
  totalAmount: number;
  startDate: string;
  days: number;
  billing: SaleBilling;
  discount: number;
  paymentType: string | null;
  invoiceRequested: boolean;
  status: SaleStatus;
  createdById: string | null;
  patient?: PatientRefDto | null;
  package?: PackageRefDto | null;
  createdBy?: UserRefDto | null;
  items?: SaleItemDto[];
  payments?: PaymentDto[];
  deliveries?: DeliveryDayDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleFilterDto extends BaseFilterDto {
  patientId?: string;
  status?: SaleStatus;
  type?: SaleType;
}

export type SaleListDto = BaseListDto<SaleDto>;

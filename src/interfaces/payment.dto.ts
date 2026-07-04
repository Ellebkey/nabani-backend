import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { PatientRefDto } from '@interfaces/refs.dto';
import type { PaymentMethod } from '@models/payment.model';

export interface UpdatePaymentDto {
  /** Register the pago: marks paid and stamps method/paid_at. */
  paid?: boolean;
  method?: PaymentMethod | null;
  amount?: number;
  dueDate?: string;
  note?: string | null;
}

export interface PaymentDto {
  id: string;
  folio: string | null;
  saleId: string;
  patientId: string;
  patient?: PatientRefDto | null;
  dueDate: string;
  amount: number;
  method: PaymentMethod | null;
  paid: boolean;
  paidAt: string | null;
  note: string | null;
  /** today − due_date in whole days (positive = overdue). */
  agingDays: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Building-block input for generating a sale's installment schedule. */
export interface PaymentInstallmentInput {
  saleId: string;
  patientId: string;
  dueDate: string;
  amount: number;
  folio?: string | null;
}

export interface PaymentFilterDto extends BaseFilterDto {
  patientId?: string;
  saleId?: string;
  paid?: boolean;
}

export type PaymentListDto = BaseListDto<PaymentDto>;

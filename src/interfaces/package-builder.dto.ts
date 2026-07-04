import type { SaleBilling } from '@models/sale.model';
import type { SaleDto } from '@interfaces/sale.dto';

/**
 * Input for POST /sales/calculate-package-and-days — the "flujo maestro" package
 * builder. Generates the delivery-day calendar (respecting the patient's `week`),
 * applies the discount precedence, chunks the days into payment installments and
 * persists Sale → Payments → DeliveryDays in one transaction.
 */
export interface CalculatePackageDaysDto {
  patientId: string;
  packageId: string;
  startDate: string;
  days: number;
  billing: SaleBilling;
  paymentType?: string | null;
  ignoreMonthlyDiscount?: boolean;
  /** Apply the package couple discount (only when monthly is not applied). */
  coupleDiscount?: boolean;
  /** Apply the package especial discount (lowest precedence). */
  especialDiscount?: boolean;
  invoiceRequested?: boolean;
  folio?: string | null;
}

export interface ChangeSaleAmountDto {
  saleId: string;
  totalAmount: number;
}

export interface CancelDeliveryDto {
  deliveryDayId: string;
}

/** What discount was actually applied (echoed back for the UI). */
export interface PackagePricingDto {
  subTotal: number;
  discountReason: 'monthly' | 'couple' | 'especial' | 'none';
  discountPercent: number;
  discountAmount: number;
  total: number;
  installmentCount: number;
  perDayAmount: number;
}

/** Response of the package builder: the created sale plus the pricing breakdown. */
export interface CalculatePackageDaysResultDto {
  pricing: PackagePricingDto;
  sale: SaleDto;
}

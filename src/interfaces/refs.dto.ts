/**
 * Lightweight cross-entity reference DTOs shared by the sale/payment/delivery
 * read models. Kept in a dependency-free module so the resource DTO files can
 * embed them without forming import cycles.
 */

/** Minimal patient reference (id + name) embedded in sales/payments/deliveries. */
export interface PatientRefDto {
  id: string;
  firstName: string;
  lastName: string;
}

/** Minimal user reference (audit trail). */
export interface UserRefDto {
  id: string;
  username: string;
  fullname?: string | null;
}

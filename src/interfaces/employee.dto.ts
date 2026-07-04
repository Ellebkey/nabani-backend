import { BaseFilterDto, BaseListDto } from '@interfaces/base.dto';
import type { EmployeePosition } from '@models/employee.model';

/** Compact employee reference embedded in expense (nómina) rows. */
export interface EmployeeRefDto {
  id: string;
  firstName: string;
  lastName: string;
  position: EmployeePosition;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  position: EmployeePosition;
  salaryQuincenal: number;
  lastPaymentDate?: string | null;
  userId?: string | null;
  active?: boolean;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: EmployeePosition;
  salaryQuincenal?: number;
  lastPaymentDate?: string | null;
  userId?: string | null;
  active?: boolean;
}

export interface EmployeeDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: EmployeePosition;
  salaryQuincenal: number;
  lastPaymentDate: string | null;
  userId: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeFilterDto extends BaseFilterDto {
  position?: EmployeePosition;
  active?: boolean;
}

/** List response; `payrollTotal` = Σ salary_quincenal over active staff (nómina base). */
export interface EmployeeListDto extends BaseListDto<EmployeeDto> {
  payrollTotal: number;
}

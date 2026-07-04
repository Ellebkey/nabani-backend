import { BaseFilterDto, BaseListDto, DateRangeFilterDto } from '@interfaces/base.dto';
import type { ExpenseType } from '@models/expense.model';
import type { EmployeeRefDto } from '@interfaces/employee.dto';

export interface BeneficiaryDto {
  id: string;
  name: string;
  createdAt?: string;
}

export interface CreateExpenseDto {
  folio?: string | null;
  /** Company/vendor name; auto-created or matched when type !== 'nomina'. */
  beneficiary?: string;
  concept: string;
  totalAmount: number;
  expenseDate: string;
  type: ExpenseType;
  /** Required (and used) when type === 'nomina'. */
  employeeId?: string | null;
  comments?: string | null;
}

export interface UpdateExpenseDto {
  folio?: string | null;
  beneficiary?: string;
  concept?: string;
  totalAmount?: number;
  expenseDate?: string;
  type?: ExpenseType;
  employeeId?: string | null;
  comments?: string | null;
}

export interface ExpenseDto {
  id: string;
  folio: string | null;
  beneficiary: BeneficiaryDto | null;
  concept: string;
  totalAmount: number;
  expenseDate: string;
  type: ExpenseType;
  employee: EmployeeRefDto | null;
  comments: string | null;
  createdById: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseFilterDto extends BaseFilterDto, DateRangeFilterDto {
  type?: ExpenseType;
  beneficiaryId?: string;
}

/** List response; `total` = Σ total_amount across the full filtered set (ignores paging). */
export interface ExpenseListDto extends BaseListDto<ExpenseDto> {
  total: number;
}

export type BeneficiaryListDto = BaseListDto<BeneficiaryDto>;

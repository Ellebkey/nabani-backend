/* ------------------------------------------------------------------ *
 *  GET /daily-incomes                                               *
 * ------------------------------------------------------------------ */
export interface DailyIncomeItemDto {
  deliveryDayId: string;
  patientName: string;
  packageLabel: string | null;
  type: string;
  amount: number;
}

export interface DailyIncomeDayDto {
  date: string;
  total: number;
  items: DailyIncomeItemDto[];
}

export interface DailyIncomesDto {
  startDate: string;
  endDate: string;
  days: DailyIncomeDayDto[];
  grandTotal: number;
}

/* ------------------------------------------------------------------ *
 *  GET /revenue-by-day                                              *
 * ------------------------------------------------------------------ */
export interface RevenueByDayItemDto {
  date: string;
  income: number;
  expense: number;
  earnings: number;
}

export interface RevenueByDayDto {
  startDate: string;
  endDate: string;
  series: RevenueByDayItemDto[];
  totals: { income: number; expense: number; earnings: number };
}

/* ------------------------------------------------------------------ *
 *  GET /incomes-by-package                                          *
 * ------------------------------------------------------------------ */
export interface IncomeByPackageDto {
  packageId: string;
  code: string;
  displayLabel: string;
  total: number;
  deliveries: number;
}

export interface IncomesByPackageDto {
  rows: IncomeByPackageDto[];
  grandTotal: number;
}

/* ------------------------------------------------------------------ *
 *  GET /expenses-by-type                                            *
 * ------------------------------------------------------------------ */
export interface ExpenseByTypeDto {
  type: string;
  total: number;
  count: number;
}

export interface ExpensesByTypeDto {
  rows: ExpenseByTypeDto[];
  grandTotal: number;
}

/* ------------------------------------------------------------------ *
 *  GET /balance                                                     *
 * ------------------------------------------------------------------ */
export interface BalanceDto {
  startDate: string;
  endDate: string;
  ingresos: number;
  gastos: number;
  ganancia: number;
  incomesByPackage: IncomeByPackageDto[];
}

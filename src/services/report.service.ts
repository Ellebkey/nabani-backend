import { Op, QueryTypes } from 'sequelize';
import { parseISO, eachDayOfInterval, format } from 'date-fns';
import { db } from '@config/sequelize';
import {
  incomeByDaySql, expenseByDaySql, incomesByPackageSql, expensesByTypeSql,
} from '@queries/report.queries';
import type {
  DailyIncomesDto,
  DailyIncomeDayDto,
  RevenueByDayDto,
  RevenueByDayItemDto,
  IncomesByPackageDto,
  IncomeByPackageDto,
  ExpensesByTypeDto,
  BalanceDto,
} from '@interfaces/report.dto';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '9999-12-31';

interface DayValueRow { date: string; income?: string; expense?: string }
interface PackageRow {
  packageId: string; code: string; displayLabel: string; total: string; deliveries: string;
}
interface TypeRow { type: string; total: string; count: string }

class ReportService {
  private round2 = (n: number): number => Math.round(n * 100) / 100;

  /** GET /daily-incomes — delivery incomes per day with patient/package + grand total. */
  dailyIncomes = async (startDate: string, endDate: string): Promise<DailyIncomesDto> => {
    const deliveries = await db.DeliveryDay.findAll({
      where: { deliveryDate: { [Op.between]: [startDate, endDate] } },
      include: [
        { model: db.Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] },
        { model: db.Package, as: 'package', attributes: ['id', 'displayLabel'] },
      ],
      order: [['deliveryDate', 'ASC']],
    });

    const daysMap = new Map<string, DailyIncomeDayDto>();
    let grandTotal = 0;
    for (const dd of deliveries) {
      const patient = dd.get('patient') as { firstName: string; lastName: string } | undefined;
      const amount = +dd.amount;
      grandTotal += amount;
      let day = daysMap.get(dd.deliveryDate);
      if (!day) {
        day = { date: dd.deliveryDate, total: 0, items: [] };
        daysMap.set(dd.deliveryDate, day);
      }
      day.items.push({
        deliveryDayId: dd.id,
        patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : '',
        packageLabel: dd.package?.displayLabel ?? null,
        type: dd.type,
        amount,
      });
      day.total = this.round2(day.total + amount);
    }

    return {
      startDate,
      endDate,
      days: Array.from(daysMap.values()),
      grandTotal: this.round2(grandTotal),
    };
  };

  /** GET /revenue-by-day — income vs expense series per day + earnings. */
  revenueByDay = async (startDate: string, endDate: string): Promise<RevenueByDayDto> => {
    const [incomeRows, expenseRows] = await Promise.all([
      db.sequelize.query<DayValueRow>(incomeByDaySql, {
        replacements: { start: startDate, end: endDate }, type: QueryTypes.SELECT,
      }),
      db.sequelize.query<DayValueRow>(expenseByDaySql, {
        replacements: { start: startDate, end: endDate }, type: QueryTypes.SELECT,
      }),
    ]);
    const incomeByDate = new Map(incomeRows.map((r) => [r.date, Number(r.income ?? 0)]));
    const expenseByDate = new Map(expenseRows.map((r) => [r.date, Number(r.expense ?? 0)]));

    const series: RevenueByDayItemDto[] = eachDayOfInterval({
      start: parseISO(startDate), end: parseISO(endDate),
    }).map((d) => {
      const date = format(d, 'yyyy-MM-dd');
      const income = this.round2(incomeByDate.get(date) ?? 0);
      const expense = this.round2(expenseByDate.get(date) ?? 0);
      return { date, income, expense, earnings: this.round2(income - expense) };
    });

    const totals = series.reduce(
      (acc, s) => ({
        income: acc.income + s.income,
        expense: acc.expense + s.expense,
        earnings: acc.earnings + s.earnings,
      }),
      { income: 0, expense: 0, earnings: 0 },
    );

    return {
      startDate,
      endDate,
      series,
      totals: {
        income: this.round2(totals.income),
        expense: this.round2(totals.expense),
        earnings: this.round2(totals.earnings),
      },
    };
  };

  /** GET /incomes-by-package — Σ delivery income grouped by package. */
  incomesByPackage = async (startDate?: string, endDate?: string): Promise<IncomesByPackageDto> => {
    const rows = await this.loadIncomesByPackage(startDate ?? MIN_DATE, endDate ?? MAX_DATE);
    return { rows, grandTotal: this.round2(rows.reduce((s, r) => s + r.total, 0)) };
  };

  private loadIncomesByPackage = async (start: string, end: string): Promise<IncomeByPackageDto[]> => {
    const rows = await db.sequelize.query<PackageRow>(incomesByPackageSql, {
      replacements: { start, end }, type: QueryTypes.SELECT,
    });
    return rows.map((r) => ({
      packageId: r.packageId,
      code: r.code,
      displayLabel: r.displayLabel,
      total: this.round2(Number(r.total)),
      deliveries: Number(r.deliveries),
    }));
  };

  /** GET /expenses-by-type — Σ expense grouped by type. */
  expensesByType = async (startDate?: string, endDate?: string): Promise<ExpensesByTypeDto> => {
    const rows = await db.sequelize.query<TypeRow>(expensesByTypeSql, {
      replacements: { start: startDate ?? MIN_DATE, end: endDate ?? MAX_DATE }, type: QueryTypes.SELECT,
    });
    const mapped = rows.map((r) => ({
      type: r.type, total: this.round2(Number(r.total)), count: Number(r.count),
    }));
    return { rows: mapped, grandTotal: this.round2(mapped.reduce((s, r) => s + r.total, 0)) };
  };

  /** GET /balance — { ganancia, ingresos, gastos } + incomes-by-package bars. */
  balance = async (startDate: string, endDate: string): Promise<BalanceDto> => {
    const [ingresos, gastos, incomesByPackage] = await Promise.all([
      db.DeliveryDay.sum('amount', { where: { deliveryDate: { [Op.between]: [startDate, endDate] } } }),
      db.Expense.sum('totalAmount', { where: { expenseDate: { [Op.between]: [startDate, endDate] } } }),
      this.loadIncomesByPackage(startDate, endDate),
    ]);
    const ingresosR = this.round2(ingresos ?? 0);
    const gastosR = this.round2(gastos ?? 0);
    return {
      startDate,
      endDate,
      ingresos: ingresosR,
      gastos: gastosR,
      ganancia: this.round2(ingresosR - gastosR),
      incomesByPackage,
    };
  };
}

export default new ReportService();

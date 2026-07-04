import { Router } from 'express';
import reportController from '@controllers/report.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/report.validation';

/**
 * Finanzas reports (Ingresos diarios, Balance, etc.). Restricted to admin + front_desk
 * (Finanzas is hidden for nutriologa — Master Context §8).
 */
export class ReportRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly READERS = ['admin', 'front_desk'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/daily-incomes')
      .get(this.canAccess, requireRole(...ReportRoute.READERS), reportController.dailyIncomes);

    this.router.route('/revenue-by-day')
      .get(this.canAccess, requireRole(...ReportRoute.READERS), reportController.revenueByDay);

    this.router.route('/incomes-by-package')
      .get(this.canAccess, requireRole(...ReportRoute.READERS), reportController.incomesByPackage);

    this.router.route('/expenses-by-type')
      .get(this.canAccess, requireRole(...ReportRoute.READERS), reportController.expensesByType);

    this.router.route('/balance')
      .get(this.canAccess, requireRole(...ReportRoute.READERS), reportController.balance);
  }
}

export default new ReportRoute().router;

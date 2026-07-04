import { Router } from 'express';
import expenseController from '@controllers/expense.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/expense.validation';

/**
 * Expenses (Finanzas) — clinic-wide, role-gated. Reads open to admin + front_desk;
 * writes admin only. `/beneficiaries` is the vendor lookup for the expense form.
 */
export class ExpenseRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/expenses')
      .get(this.canAccess, requireRole('admin', 'front_desk'), expenseController.list)
      .post(this.canAccess, requireRole('admin'), expenseController.create);

    this.router.route('/expenses/:id')
      .get(this.canAccess, requireRole('admin', 'front_desk'), expenseController.getById)
      .put(this.canAccess, requireRole('admin'), expenseController.update)
      .delete(this.canAccess, requireRole('admin'), expenseController.delete);

    this.router.route('/beneficiaries')
      .get(this.canAccess, requireRole('admin', 'front_desk'), expenseController.listBeneficiaries);
  }
}

export default new ExpenseRoute().router;

import { Router } from 'express';
import employeeController from '@controllers/employee.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/employee.validation';

/**
 * Employees — staff roster driving the Nómina flow. Admin-only (Finanzas): both
 * reads and writes are restricted to admin.
 */
export class EmployeeRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/employees')
      .get(this.canAccess, requireRole('admin'), employeeController.list)
      .post(this.canAccess, requireRole('admin'), employeeController.create);

    this.router.route('/employees/:id')
      .get(this.canAccess, requireRole('admin'), employeeController.getById)
      .put(this.canAccess, requireRole('admin'), employeeController.update)
      .delete(this.canAccess, requireRole('admin'), employeeController.delete);
  }
}

export default new EmployeeRoute().router;

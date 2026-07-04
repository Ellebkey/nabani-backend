import { Router } from 'express';
import saleController from '@controllers/sale.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/sale.validation';

/**
 * Sales — reads open to authenticated staff; writes restricted to admin + front_desk.
 * Day/payment generation (calculate-package-and-days) is an orchestrator endpoint.
 */
export class SaleRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/sales')
      .get(this.canAccess, saleController.list)
      .post(this.canAccess, requireRole('admin', 'front_desk'), saleController.create);

    this.router.route('/sales/:id')
      .get(this.canAccess, saleController.getById)
      .delete(this.canAccess, requireRole('admin', 'front_desk'), saleController.delete);
  }
}

export default new SaleRoute().router;

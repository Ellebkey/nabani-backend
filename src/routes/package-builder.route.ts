import { Router } from 'express';
import packageBuilderController from '@controllers/package-builder.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/package-builder.validation';

/**
 * Package builder + sale/delivery money orchestration (cross-group). Writes are
 * restricted to admin + front_desk (Master Context §8).
 */
export class PackageBuilderRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly WRITERS = ['admin', 'front_desk'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/sales/calculate-package-and-days')
      .post(this.canAccess, requireRole(...PackageBuilderRoute.WRITERS), packageBuilderController.calculate);

    this.router.route('/sales/change-amount')
      .post(this.canAccess, requireRole(...PackageBuilderRoute.WRITERS), packageBuilderController.changeAmount);

    this.router.route('/delivery-days/cancel')
      .post(this.canAccess, requireRole(...PackageBuilderRoute.WRITERS), packageBuilderController.cancelDelivery);
  }
}

export default new PackageBuilderRoute().router;

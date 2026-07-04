import { Router } from 'express';
import deliveryController from '@controllers/delivery.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/delivery.validation';

/**
 * Delivery days — reads open to all operational roles (admin, nutriologa, front_desk,
 * cocina, reparto); basic writes restricted to admin. Authorize/cancel/production are
 * orchestrator endpoints (they cross groups).
 */
export class DeliveryRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly READERS = ['admin', 'nutriologa', 'front_desk', 'cocina', 'reparto'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/delivery-days')
      .get(this.canAccess, requireRole(...DeliveryRoute.READERS), deliveryController.list);

    this.router.route('/calendar-days/:patientId')
      .get(this.canAccess, requireRole(...DeliveryRoute.READERS), deliveryController.calendarDays);

    this.router.route('/delivery-days/:id')
      .get(this.canAccess, requireRole(...DeliveryRoute.READERS), deliveryController.getById)
      .put(this.canAccess, requireRole('admin'), deliveryController.update)
      .delete(this.canAccess, requireRole('admin'), deliveryController.delete);
  }
}

export default new DeliveryRoute().router;

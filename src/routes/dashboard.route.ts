import { Router } from 'express';
import dashboardController from '@controllers/dashboard.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/dashboard.validation';

/**
 * Hoy dashboard. Open to admin, nutriologa and front_desk. Income/cobranza fields are
 * present in the payload; the frontend hides them for nutriologa (Master Context §8).
 */
export class DashboardRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly READERS = ['admin', 'nutriologa', 'front_desk'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/dashboard/today')
      .get(this.canAccess, requireRole(...DashboardRoute.READERS), dashboardController.today);

    this.router.route('/dashboard/attention')
      .get(this.canAccess, requireRole(...DashboardRoute.READERS), dashboardController.attention);

    this.router.route('/dashboard/week')
      .get(this.canAccess, requireRole(...DashboardRoute.READERS), dashboardController.week);
  }
}

export default new DashboardRoute().router;

import { Router } from 'express';
import adjustmentController from '@controllers/adjustment.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/adjustment.validation';

/**
 * Menu resolution + ajustes por paciente (the conflict engine). Menu apply, queue,
 * swap and eliminate are nutrición work (admin, nutriologa). Bulk authorize also
 * allows front_desk (on payment confirm) — adeudo does NOT block.
 */
export class AdjustmentRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly NUTRI = ['admin', 'nutriologa'];
  private static readonly AUTHORIZERS = ['admin', 'nutriologa', 'front_desk'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/menu-days/:id/apply')
      .post(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.applyByMenuDay);

    this.router.route('/apply-menu-to-patients')
      .post(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.applyByDate);

    this.router.route('/adjustments')
      .get(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.queue);

    this.router.route('/adjustments/:deliveryDayId')
      .get(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.detail);

    this.router.route('/adjustments/:deliveryDayId/swap-suggestions')
      .get(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.swapSuggestions);

    this.router.route('/adjustments/:deliveryDayId/swap')
      .post(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.swap);

    this.router.route('/adjustments/:deliveryDayId/eliminate')
      .post(this.canAccess, requireRole(...AdjustmentRoute.NUTRI), adjustmentController.eliminate);

    this.router.route('/authorize')
      .post(this.canAccess, requireRole(...AdjustmentRoute.AUTHORIZERS), adjustmentController.authorize);
  }
}

export default new AdjustmentRoute().router;

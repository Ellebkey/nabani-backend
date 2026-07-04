import { Router } from 'express';
import productionController from '@controllers/production.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/production.validation';

/**
 * Producción (cocina) read-only aggregations. Open to admin, nutriologa, cocina and
 * reparto (Master Context §8).
 */
export class ProductionRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  private static readonly READERS = ['admin', 'nutriologa', 'cocina', 'reparto'];

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/production-map')
      .get(this.canAccess, requireRole(...ProductionRoute.READERS), productionController.productionMap);

    this.router.route('/delivery-labels')
      .get(this.canAccess, requireRole(...ProductionRoute.READERS), productionController.deliveryLabels);

    this.router.route('/kitchen-view')
      .get(this.canAccess, requireRole(...ProductionRoute.READERS), productionController.kitchenView);

    this.router.route('/shopping-list')
      .get(this.canAccess, requireRole(...ProductionRoute.READERS), productionController.shoppingList);
  }
}

export default new ProductionRoute().router;

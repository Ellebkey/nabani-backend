import { Router } from 'express';
import dishController from '@controllers/dish.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/dish.validation';

/**
 * Dishes — the biblioteca de platillos. Reads open to authenticated staff
 * (menu building needs them); writes restricted to admin or nutrióloga
 * (nutriólogas build the dish library).
 */
export class DishRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/dishes')
      .get(this.canAccess, dishController.list)
      .post(this.canAccess, requireRole('admin', 'nutriologa'), dishController.create);

    this.router.route('/dishes/:id')
      .get(this.canAccess, dishController.getById)
      .put(this.canAccess, requireRole('admin', 'nutriologa'), dishController.update)
      .delete(this.canAccess, requireRole('admin', 'nutriologa'), dishController.delete);
  }
}

export default new DishRoute().router;

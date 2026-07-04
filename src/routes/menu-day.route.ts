import { Router } from 'express';
import menuDayController from '@controllers/menu-day.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/menu-day.validation';

/**
 * Menús del día — daily menu templates (5 meal slots → dishes). Reads open to
 * authenticated staff; writes restricted to admin or nutrióloga.
 */
export class MenuDayRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/menu-days')
      .get(this.canAccess, menuDayController.list)
      .post(this.canAccess, requireRole('admin', 'nutriologa'), menuDayController.create);

    this.router.route('/menu-days/by-date/:date')
      .get(this.canAccess, menuDayController.getByDate);

    this.router.route('/menu-days/:id')
      .get(this.canAccess, menuDayController.getById)
      .put(this.canAccess, requireRole('admin', 'nutriologa'), menuDayController.update)
      .delete(this.canAccess, requireRole('admin', 'nutriologa'), menuDayController.delete);
  }
}

export default new MenuDayRoute().router;

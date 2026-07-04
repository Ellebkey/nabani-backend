import { Router } from 'express';
import diseaseController from '@controllers/disease.controller';
import calorieLevelController from '@controllers/calorie-level.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/disease.validation';
import '@validations/calorie-level.validation';

/**
 * Reference catalogs — Diseases + CalorieLevels. Reads open to authenticated staff;
 * writes admin only.
 */
export class CatalogRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/diseases')
      .get(this.canAccess, diseaseController.list)
      .post(this.canAccess, requireRole('admin'), diseaseController.create);
    this.router.route('/diseases/:id')
      .get(this.canAccess, diseaseController.getById)
      .put(this.canAccess, requireRole('admin'), diseaseController.update)
      .delete(this.canAccess, requireRole('admin'), diseaseController.delete);

    this.router.route('/calorie-levels')
      .get(this.canAccess, calorieLevelController.list)
      .post(this.canAccess, requireRole('admin'), calorieLevelController.create);
    this.router.route('/calorie-levels/:id')
      .get(this.canAccess, calorieLevelController.getById)
      .put(this.canAccess, requireRole('admin'), calorieLevelController.update)
      .delete(this.canAccess, requireRole('admin'), calorieLevelController.delete);
  }
}

export default new CatalogRoute().router;

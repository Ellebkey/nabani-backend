import { Router } from 'express';
import packageController from '@controllers/package.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/package.validation';

/**
 * Packages — reads open to authenticated staff; writes restricted to admin (Catálogos).
 */
export class PackageRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/packages')
      .get(this.canAccess, packageController.list)
      .post(this.canAccess, requireRole('admin'), packageController.create);

    this.router.route('/packages/:id')
      .get(this.canAccess, packageController.getById)
      .put(this.canAccess, requireRole('admin'), packageController.update)
      .delete(this.canAccess, requireRole('admin'), packageController.delete);
  }
}

export default new PackageRoute().router;

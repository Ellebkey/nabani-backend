import { Router } from 'express';
import userController from '@controllers/user.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/user.validation';

export class UserRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() {
    this.init();
  }

  private init(): void {
    this.router.route('/users')
      .get(this.canAccess, requireRole('admin'), userController.list)
      .post(this.canAccess, requireRole('admin'), userController.create);

    this.router.route('/users/:id')
      .get(this.canAccess, userController.getById)
      .put(this.canAccess, userController.update);

    this.router.route('/users/:id/config')
      .get(this.canAccess, userController.getConfig)
      .put(this.canAccess, userController.updateConfig);

    this.router.route('/users/:id/default-account')
      .post(this.canAccess, userController.setDefaultAccount);
  }
}

export default new UserRoute().router;

import { Router } from 'express';
import ingredientController from '@controllers/ingredient.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/ingredient.validation';

/**
 * Ingredients — reads open to authenticated staff (menu building needs them);
 * writes restricted to admin (Catálogos).
 */
export class IngredientRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/ingredients')
      .get(this.canAccess, ingredientController.list)
      .post(this.canAccess, requireRole('admin'), ingredientController.create);

    this.router.route('/ingredients/:id')
      .get(this.canAccess, ingredientController.getById)
      .put(this.canAccess, requireRole('admin'), ingredientController.update)
      .delete(this.canAccess, requireRole('admin'), ingredientController.delete);
  }
}

export default new IngredientRoute().router;

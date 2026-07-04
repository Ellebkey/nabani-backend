import { Router } from 'express';
import paymentController from '@controllers/payment.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/payment.validation';

/**
 * Payments (cobranza) — reads open to authenticated staff; registering a pago and
 * deletes restricted to admin + front_desk.
 */
export class PaymentRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/payments')
      .get(this.canAccess, paymentController.list);

    this.router.route('/payments/:id')
      .get(this.canAccess, paymentController.getById)
      .put(this.canAccess, requireRole('admin', 'front_desk'), paymentController.update)
      .delete(this.canAccess, requireRole('admin', 'front_desk'), paymentController.delete);
  }
}

export default new PaymentRoute().router;

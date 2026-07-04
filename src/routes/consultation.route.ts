import { Router } from 'express';
import consultationController from '@controllers/consultation.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/consultation.validation';

/**
 * Consultations — a patient's clinical visits. Reads open to admin, nutriologa
 * and front_desk; writes restricted to admin and nutriologa.
 */
export class ConsultationRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/patients/:patientId/consultations')
      .get(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), consultationController.list)
      .post(this.canAccess, requireRole('admin', 'nutriologa'), consultationController.create);

    this.router.route('/consultations/:id')
      .get(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), consultationController.getById)
      .put(this.canAccess, requireRole('admin', 'nutriologa'), consultationController.update)
      .delete(this.canAccess, requireRole('admin', 'nutriologa'), consultationController.delete);
  }
}

export default new ConsultationRoute().router;

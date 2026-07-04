import { Router } from 'express';
import patientController from '@controllers/patient.controller';
import Auth from '@middlewares/auth';
import { requireRole } from '@middlewares/role.middleware';
import '@validations/patient.validation';

/**
 * Patients — clinic-wide (no per-user scoping). Reads + writes are open to
 * admin, nutriologa and front_desk; access is gated by role only.
 */
export class PatientRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() { this.init(); }

  private init(): void {
    this.router.route('/patients')
      .get(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), patientController.list)
      .post(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), patientController.create);

    this.router.route('/patients/:id')
      .get(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), patientController.getById)
      .put(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), patientController.update);

    this.router.route('/patients/:id/status')
      .put(this.canAccess, requireRole('admin', 'nutriologa', 'front_desk'), patientController.updateStatus);
  }
}

export default new PatientRoute().router;

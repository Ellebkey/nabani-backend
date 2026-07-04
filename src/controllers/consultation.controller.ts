import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import { requireUserId } from '@utils/user-context.util';
import ConsultationService from '@services/consultation.service';
import {
  CreateConsultationDto, UpdateConsultationDto, PatientIdParamsDto,
} from '@interfaces/consultation.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class ConsultationController {
  private service = ConsultationService;

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { patientId } = validateDto<PatientIdParamsDto>('patientIdParam', req.params);
      return res.json(await this.service.findAllForPatient(patientId));
    } catch (error) { return next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      return res.json(await this.service.findById(id));
    } catch (error) { return next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = requireUserId(req.user?.id);
      const { patientId } = validateDto<PatientIdParamsDto>('patientIdParam', req.params);
      const dto = validateDto<CreateConsultationDto>('createConsultation', req.body);
      return res.status(201).json(await this.service.create(patientId, dto, userId));
    } catch (error) { return next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const dto = validateDto<UpdateConsultationDto>('updateConsultation', req.body);
      return res.json(await this.service.update(id, dto));
    } catch (error) { return next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      await this.service.delete(id);
      return res.status(204).send();
    } catch (error) { return next(error); }
  };
}

export default new ConsultationController();

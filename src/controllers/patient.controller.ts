import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import { requireUserId } from '@utils/user-context.util';
import PatientService from '@services/patient.service';
import {
  CreatePatientDto, UpdatePatientDto, UpdatePatientStatusDto, PatientFilterDto,
} from '@interfaces/patient.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class PatientController {
  private service = PatientService;

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<PatientFilterDto>('patientFilter', req.query);
      return res.json(await this.service.findAll(filters));
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
      const dto = validateDto<CreatePatientDto>('createPatient', req.body);
      return res.status(201).json(await this.service.create(dto, userId));
    } catch (error) { return next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const dto = validateDto<UpdatePatientDto>('updatePatient', req.body);
      return res.json(await this.service.update(id, dto));
    } catch (error) { return next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const { status } = validateDto<UpdatePatientStatusDto>('updatePatientStatus', req.body);
      return res.json(await this.service.updateStatus(id, status));
    } catch (error) { return next(error); }
  };
}

export default new PatientController();

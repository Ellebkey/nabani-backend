import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import DeliveryDayService from '@services/delivery.service';
import {
  UpdateDeliveryDayDto, DeliveryDayFilterDto,
} from '@interfaces/delivery.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class DeliveryDayController {
  private service = DeliveryDayService;

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<DeliveryDayFilterDto>('deliveryDayFilter', req.query);
      return res.json(await this.service.findAll(filters));
    } catch (error) { return next(error); }
  };

  calendarDays = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { patientId } = validateDto<{ patientId: string }>('deliveryPatientParam', req.params);
      return res.json(await this.service.calendarDays(patientId));
    } catch (error) { return next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      return res.json(await this.service.findById(id));
    } catch (error) { return next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const dto = validateDto<UpdateDeliveryDayDto>('updateDeliveryDay', req.body);
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

export default new DeliveryDayController();

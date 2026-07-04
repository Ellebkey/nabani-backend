import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import CalorieLevelService from '@services/calorie-level.service';
import { CreateCalorieLevelDto, UpdateCalorieLevelDto } from '@interfaces/calorie-level.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class CalorieLevelController {
  private service = CalorieLevelService;

  list = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      return res.json(await this.service.findAll());
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
      const dto = validateDto<CreateCalorieLevelDto>('createCalorieLevel', req.body);
      return res.status(201).json(await this.service.create(dto));
    } catch (error) { return next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const dto = validateDto<UpdateCalorieLevelDto>('updateCalorieLevel', req.body);
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

export default new CalorieLevelController();

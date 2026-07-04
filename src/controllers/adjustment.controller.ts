import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import MenuResolutionService from '@services/menu-resolution.service';
import AdjustmentService from '@services/adjustment.service';
import { EntityUuidParamsDto } from '@interfaces/base.dto';
import {
  SwapDto, EliminateDto, AuthorizeDto,
} from '@interfaces/adjustment.dto';

interface AdjustmentsQuery { date: string; filter: 'todos' | 'conflictos' | 'listos' }
interface DeliveryDayParam { deliveryDayId: string }
interface ApplyMenuBody { date: string }
interface SwapSuggestionQuery { deliveryMealIngredientId: string }

class AdjustmentController {
  private menu = MenuResolutionService;
  private service = AdjustmentService;

  /** POST /menu-days/:id/apply */
  applyByMenuDay = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      return res.json(await this.menu.applyByMenuDayId(id));
    } catch (error) { return next(error); }
  };

  /** POST /apply-menu-to-patients { date } */
  applyByDate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<ApplyMenuBody>('applyMenuBody', req.body);
      return res.json(await this.menu.applyByDate(date));
    } catch (error) { return next(error); }
  };

  /** GET /adjustments?date=&filter= */
  queue = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date, filter } = validateDto<AdjustmentsQuery>('adjustmentsQuery', req.query);
      return res.json(await this.service.queue(date, filter));
    } catch (error) { return next(error); }
  };

  /** GET /adjustments/:deliveryDayId */
  detail = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deliveryDayId } = validateDto<DeliveryDayParam>('deliveryDayParam', req.params);
      return res.json(await this.service.detail(deliveryDayId));
    } catch (error) { return next(error); }
  };

  /** GET /adjustments/:deliveryDayId/swap-suggestions?deliveryMealIngredientId= */
  swapSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deliveryDayId } = validateDto<DeliveryDayParam>('deliveryDayParam', req.params);
      const { deliveryMealIngredientId } = validateDto<SwapSuggestionQuery>('swapSuggestionQuery', req.query);
      return res.json(await this.service.swapSuggestions(deliveryDayId, deliveryMealIngredientId));
    } catch (error) { return next(error); }
  };

  /** POST /adjustments/:deliveryDayId/swap */
  swap = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deliveryDayId } = validateDto<DeliveryDayParam>('deliveryDayParam', req.params);
      const dto = validateDto<SwapDto>('swapBody', req.body);
      return res.json(await this.service.swap(deliveryDayId, dto));
    } catch (error) { return next(error); }
  };

  /** POST /adjustments/:deliveryDayId/eliminate */
  eliminate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deliveryDayId } = validateDto<DeliveryDayParam>('deliveryDayParam', req.params);
      const dto = validateDto<EliminateDto>('eliminateBody', req.body);
      return res.json(await this.service.eliminate(deliveryDayId, dto));
    } catch (error) { return next(error); }
  };

  /** POST /authorize { deliveryDayIds: [] } */
  authorize = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<AuthorizeDto>('authorizeBody', req.body);
      return res.json(await this.service.authorize(dto.deliveryDayIds));
    } catch (error) { return next(error); }
  };
}

export default new AdjustmentController();

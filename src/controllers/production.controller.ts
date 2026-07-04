import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import ProductionService from '@services/production.service';

interface DateQuery { date: string }
interface ShoppingListQuery {
  date?: string; week?: string; startDate?: string; endDate?: string;
}

class ProductionController {
  private service = ProductionService;

  productionMap = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DateQuery>('dateQuery', req.query);
      return res.json(await this.service.productionMap(date));
    } catch (error) { return next(error); }
  };

  deliveryLabels = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DateQuery>('dateQuery', req.query);
      return res.json(await this.service.deliveryLabels(date));
    } catch (error) { return next(error); }
  };

  kitchenView = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DateQuery>('dateQuery', req.query);
      return res.json(await this.service.kitchenView(date));
    } catch (error) { return next(error); }
  };

  shoppingList = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const params = validateDto<ShoppingListQuery>('shoppingListQuery', req.query);
      const { start, end } = this.service.resolveRange(params);
      return res.json(await this.service.shoppingList(start, end));
    } catch (error) { return next(error); }
  };
}

export default new ProductionController();

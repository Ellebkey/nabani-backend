import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import DashboardService from '@services/dashboard.service';

interface DashboardQuery { date?: string }

class DashboardController {
  private service = DashboardService;

  today = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DashboardQuery>('dashboardQuery', req.query);
      return res.json(await this.service.dashboardToday(this.service.resolveDate(date)));
    } catch (error) { return next(error); }
  };

  attention = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DashboardQuery>('dashboardQuery', req.query);
      return res.json(await this.service.dashboardAttention(this.service.resolveDate(date)));
    } catch (error) { return next(error); }
  };

  week = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { date } = validateDto<DashboardQuery>('dashboardQuery', req.query);
      return res.json(await this.service.dashboardWeek(this.service.resolveDate(date)));
    } catch (error) { return next(error); }
  };
}

export default new DashboardController();

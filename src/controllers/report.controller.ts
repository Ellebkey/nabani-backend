import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import ReportService from '@services/report.service';
import { RequiredDateRangeDto, DateRangeFilterDto } from '@interfaces/base.dto';

class ReportController {
  private service = ReportService;

  dailyIncomes = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<RequiredDateRangeDto>('reportRange', req.query);
      return res.json(await this.service.dailyIncomes(startDate, endDate));
    } catch (error) { return next(error); }
  };

  revenueByDay = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<RequiredDateRangeDto>('reportRange', req.query);
      return res.json(await this.service.revenueByDay(startDate, endDate));
    } catch (error) { return next(error); }
  };

  incomesByPackage = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<DateRangeFilterDto>('reportRangeOptional', req.query);
      return res.json(await this.service.incomesByPackage(startDate, endDate));
    } catch (error) { return next(error); }
  };

  expensesByType = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<DateRangeFilterDto>('reportRangeOptional', req.query);
      return res.json(await this.service.expensesByType(startDate, endDate));
    } catch (error) { return next(error); }
  };

  balance = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<RequiredDateRangeDto>('reportRange', req.query);
      return res.json(await this.service.balance(startDate, endDate));
    } catch (error) { return next(error); }
  };
}

export default new ReportController();

import { Request, Response, NextFunction } from 'express';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { validateDto } from '@utils/validation.util';
import ReportService from '@services/report.service';
import { DateRangeFilterDto } from '@interfaces/base.dto';

/** Default a missing report range to the current calendar month (America/Mexico_City
 *  is a server-local concern; reports use plain calendar dates). Keeps the finance
 *  screens robust when they load before their date-range filter has emitted. */
const monthRange = (): { start: string; end: string } => {
  const now = new Date();
  return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
};

class ReportController {
  private service = ReportService;

  dailyIncomes = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<DateRangeFilterDto>('reportRangeOptional', req.query);
      const r = monthRange();
      return res.json(await this.service.dailyIncomes(startDate ?? r.start, endDate ?? r.end));
    } catch (error) { return next(error); }
  };

  revenueByDay = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { startDate, endDate } = validateDto<DateRangeFilterDto>('reportRangeOptional', req.query);
      const r = monthRange();
      return res.json(await this.service.revenueByDay(startDate ?? r.start, endDate ?? r.end));
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
      const { startDate, endDate } = validateDto<DateRangeFilterDto>('reportRangeOptional', req.query);
      const r = monthRange();
      return res.json(await this.service.balance(startDate ?? r.start, endDate ?? r.end));
    } catch (error) { return next(error); }
  };
}

export default new ReportController();

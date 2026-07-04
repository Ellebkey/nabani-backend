import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import { requireUserId } from '@utils/user-context.util';
import ExpenseService from '@services/expense.service';
import {
  CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto,
} from '@interfaces/expense.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class ExpenseController {
  private service = ExpenseService;

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<ExpenseFilterDto>('expenseFilter', req.query);
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
      const dto = validateDto<CreateExpenseDto>('createExpense', req.body);
      return res.status(201).json(await this.service.create(dto, userId));
    } catch (error) { return next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      const dto = validateDto<UpdateExpenseDto>('updateExpense', req.body);
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

  listBeneficiaries = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      return res.json(await this.service.listBeneficiaries());
    } catch (error) { return next(error); }
  };
}

export default new ExpenseController();

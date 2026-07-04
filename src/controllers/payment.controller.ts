import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import PaymentService from '@services/payment.service';
import { UpdatePaymentDto, PaymentFilterDto } from '@interfaces/payment.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

class PaymentController {
  private service = PaymentService;

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<PaymentFilterDto>('paymentFilter', req.query);
      return res.json(await this.service.findAll(filters));
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
      const dto = validateDto<UpdatePaymentDto>('updatePayment', req.body);
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

export default new PaymentController();

import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import PackageBuilderService from '@services/package-builder.service';
import {
  CalculatePackageDaysDto, ChangeSaleAmountDto, CancelDeliveryDto,
} from '@interfaces/package-builder.dto';

class PackageBuilderController {
  private service = PackageBuilderService;

  calculate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<CalculatePackageDaysDto>('calculatePackageDays', req.body);
      return res.status(201).json(await this.service.calculatePackageAndDays(dto, req.user?.id ?? null));
    } catch (error) { return next(error); }
  };

  changeAmount = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<ChangeSaleAmountDto>('changeSaleAmount', req.body);
      return res.json(await this.service.changeAmount(dto));
    } catch (error) { return next(error); }
  };

  cancelDelivery = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<CancelDeliveryDto>('cancelDelivery', req.body);
      return res.json(await this.service.cancelDelivery(dto));
    } catch (error) { return next(error); }
  };
}

export default new PackageBuilderController();

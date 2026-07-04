import { Op } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { PackageInstance } from '@models/package.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreatePackageDto,
  UpdatePackageDto,
  PackageDto,
  PackageFilterDto,
  PackageListDto,
} from '@interfaces/package.dto';

class PackageService {
  findAll = async (filters: PackageFilterDto = {}): Promise<PackageListDto> => {
    const {
      searchText, active, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) {
      where[Op.or] = [
        { displayLabel: { [Op.iLike]: `%${searchText}%` } },
        { code: { [Op.iLike]: `%${searchText}%` } },
      ];
    }
    if (typeof active === 'boolean') where.active = active;

    const { count, rows } = await db.Package.findAndCountAll({
      where,
      limit,
      offset,
      order: [['displayLabel', 'ASC']],
    });

    return { rows: rows.map((p) => this.toDto(p)), count: +count };
  };

  findById = async (id: string): Promise<PackageDto> => {
    const pkg = await db.Package.findByPk(id);
    if (!pkg) throw new NotFoundError('Package', id);
    return this.toDto(pkg);
  };

  create = async (dto: CreatePackageDto): Promise<PackageDto> =>
    withTransaction(async (transaction) => {
      const pkg = await db.Package.create({
        displayLabel: dto.displayLabel,
        code: dto.code,
        pricePerDay: dto.pricePerDay,
        consultPrice: dto.consultPrice ?? null,
        monthDiscount: dto.monthDiscount ?? 0,
        coupleDiscount: dto.coupleDiscount ?? 0,
        especialDiscount: dto.especialDiscount ?? 0,
        includesDesayuno: dto.includesDesayuno ?? false,
        includesSnack1: dto.includesSnack1 ?? false,
        includesComida: dto.includesComida ?? false,
        includesSnack2: dto.includesSnack2 ?? false,
        includesCena: dto.includesCena ?? false,
      }, { transaction });

      logger.info('Package created', { packageId: pkg.id });
      return this.toDto(pkg);
    });

  update = async (id: string, dto: UpdatePackageDto): Promise<PackageDto> =>
    withTransaction(async (transaction) => {
      const pkg = await db.Package.findByPk(id, { transaction });
      if (!pkg) throw new NotFoundError('Package', id);
      await pkg.update(dto, { transaction });
      logger.info('Package updated', { packageId: id });
      return this.toDto(pkg);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Package.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Package', id);
      logger.info('Package deleted', { packageId: id });
    });

  private toDto = (p: PackageInstance): PackageDto => ({
    id: p.id,
    displayLabel: p.displayLabel,
    code: p.code,
    pricePerDay: +p.pricePerDay,
    consultPrice: p.consultPrice == null ? null : +p.consultPrice,
    monthDiscount: p.monthDiscount,
    coupleDiscount: p.coupleDiscount,
    especialDiscount: p.especialDiscount,
    includesDesayuno: p.includesDesayuno,
    includesSnack1: p.includesSnack1,
    includesComida: p.includesComida,
    includesSnack2: p.includesSnack2,
    includesCena: p.includesCena,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
}

export default new PackageService();

import { Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { SaleInstance } from '@models/sale.model';
import { SaleItemInstance } from '@models/sale-item.model';
import { WhereClause } from '@interfaces/base.dto';
import { PatientRefDto } from '@interfaces/refs.dto';
import {
  CreateSaleDto,
  CreateSaleItemDto,
  SaleDto,
  SaleItemDto,
  SaleFilterDto,
  SaleListDto,
} from '@interfaces/sale.dto';
import PaymentService from '@services/payment.service';
import DeliveryDayService from '@services/delivery.service';

class SaleService {
  private packageInclude = (): Includeable => ({
    model: db.Package,
    as: 'package',
    attributes: ['id', 'code', 'displayLabel', 'pricePerDay'],
  });

  private patientInclude = (): Includeable => ({
    model: db.Patient,
    as: 'patient',
    attributes: ['id', 'firstName', 'lastName'],
  });

  private createdByInclude = (): Includeable => ({
    model: db.User,
    as: 'createdBy',
    attributes: ['id', 'username', 'fullname'],
  });

  findAll = async (filters: SaleFilterDto = {}): Promise<SaleListDto> => {
    const {
      patientId, status, type, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (type) where.type = type;

    const { count, rows } = await db.Sale.findAndCountAll({
      where,
      include: [this.patientInclude(), this.packageInclude()],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return { rows: rows.map((s) => this.toDto(s)), count: +count };
  };

  findById = async (id: string): Promise<SaleDto> => {
    const sale = await db.Sale.findByPk(id, {
      include: [
        this.patientInclude(),
        this.packageInclude(),
        this.createdByInclude(),
        { model: db.Payment, as: 'payments' },
        { model: db.DeliveryDay, as: 'deliveries' },
      ],
      order: [
        [{ model: db.Payment, as: 'payments' }, 'dueDate', 'ASC'],
        [{ model: db.DeliveryDay, as: 'deliveries' }, 'deliveryDate', 'ASC'],
      ],
    });
    if (!sale) throw new NotFoundError('Sale', id);

    const items = await this.loadItems(id);
    return this.toDto(sale, items);
  };

  /**
   * Building block: create a sale + its line items in one transaction. The
   * payment/delivery-day generation (calculate-package-and-days) is composed by the
   * orchestrator on top of this using PaymentService/DeliveryDayService building blocks.
   */
  create = async (dto: CreateSaleDto, createdById: string | null = null): Promise<SaleDto> =>
    withTransaction(async (transaction) => {
      const sale = await db.Sale.create({
        folio: this.emptyToNull(dto.folio),
        patientId: dto.patientId,
        packageId: dto.packageId ?? null,
        type: dto.type,
        totalAmount: dto.totalAmount,
        startDate: dto.startDate,
        days: dto.days,
        billing: dto.billing,
        discount: dto.discount ?? 0,
        paymentType: this.emptyToNull(dto.paymentType),
        invoiceRequested: dto.invoiceRequested ?? false,
        status: dto.status ?? 'pendiente',
        createdById: createdById ?? null,
      }, { transaction });

      await this.setItems(sale.id, dto.items ?? [], transaction);
      logger.info('Sale created', { saleId: sale.id });

      return this.findByIdTx(sale.id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const sale = await db.Sale.findByPk(id, { transaction });
      if (!sale) throw new NotFoundError('Sale', id);

      // Remove generated delivery days (cascades meals + meal ingredients at DB level),
      // then payments and line items, before the sale itself.
      const deliveries = await db.DeliveryDay.findAll({
        where: { saleId: id }, attributes: ['id'], transaction,
      });
      await Promise.all(
        deliveries.map((d) => DeliveryDayService.deleteCascade(d.id, transaction)),
      );
      await db.Payment.destroy({ where: { saleId: id }, transaction });
      await db.SaleItem.destroy({ where: { saleId: id }, transaction });
      await db.Sale.destroy({ where: { id }, transaction });
      logger.info('Sale deleted', { saleId: id });
    });

  private setItems = async (
    saleId: string,
    items: CreateSaleItemDto[],
    transaction: Transaction,
  ): Promise<void> => {
    await db.SaleItem.destroy({ where: { saleId }, transaction });
    if (items.length) {
      await db.SaleItem.bulkCreate(
        items.map((it) => ({
          saleId,
          packageId: it.packageId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subTotal: it.subTotal ?? it.quantity * it.unitPrice,
        })),
        { transaction },
      );
    }
  };

  private loadItems = async (saleId: string, transaction?: Transaction): Promise<SaleItemDto[]> => {
    const items = await db.SaleItem.findAll({
      where: { saleId },
      include: [{
        model: db.Package,
        as: 'package',
        attributes: ['id', 'code', 'displayLabel', 'pricePerDay'],
      }],
      transaction,
    });
    return items.map((it) => this.toItemDto(it));
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<SaleDto> => {
    const sale = await db.Sale.findByPk(id, {
      include: [this.patientInclude(), this.packageInclude(), this.createdByInclude()],
      transaction,
    });
    if (!sale) throw new NotFoundError('Sale', id);
    const items = await this.loadItems(id, transaction);
    return this.toDto(sale, items);
  };

  private emptyToNull = (value?: string | null): string | null =>
    (value == null || value === '' ? null : value);

  private patientRef = (sale: SaleInstance): PatientRefDto | null => {
    const p = sale.get('patient') as PatientRefDto | null | undefined;
    return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName } : null;
  };

  private toItemDto = (it: SaleItemInstance): SaleItemDto => ({
    id: it.id,
    packageId: it.packageId,
    quantity: it.quantity,
    unitPrice: +it.unitPrice,
    subTotal: +it.subTotal,
    package: it.package
      ? {
        id: it.package.id,
        code: it.package.code,
        displayLabel: it.package.displayLabel,
        pricePerDay: +it.package.pricePerDay,
      }
      : null,
  });

  private toDto = (s: SaleInstance, items?: SaleItemDto[]): SaleDto => ({
    id: s.id,
    folio: s.folio ?? null,
    patientId: s.patientId,
    packageId: s.packageId ?? null,
    type: s.type,
    totalAmount: +s.totalAmount,
    startDate: s.startDate,
    days: s.days,
    billing: s.billing,
    discount: +s.discount,
    paymentType: s.paymentType ?? null,
    invoiceRequested: s.invoiceRequested,
    status: s.status,
    createdById: s.createdById ?? null,
    patient: this.patientRef(s),
    package: s.package
      ? {
        id: s.package.id,
        code: s.package.code,
        displayLabel: s.package.displayLabel,
        pricePerDay: +s.package.pricePerDay,
      }
      : null,
    createdBy: s.createdBy
      ? { id: s.createdBy.id, username: s.createdBy.username, fullname: s.createdBy.fullname ?? null }
      : null,
    items,
    payments: s.payments ? s.payments.map((p) => PaymentService.toDto(p)) : undefined,
    deliveries: s.deliveries ? s.deliveries.map((d) => DeliveryDayService.toDto(d)) : undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}

export default new SaleService();

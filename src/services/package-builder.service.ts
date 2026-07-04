import { Op } from 'sequelize';
import {
  parseISO, addDays, getDay, format,
} from 'date-fns';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError, ConflictError, BadRequestError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import type { PatientWeek } from '@models/patient.model';
import SaleService from '@services/sale.service';
import PaymentService from '@services/payment.service';
import DeliveryDayService from '@services/delivery.service';
import type { SaleDto } from '@interfaces/sale.dto';
import type { PaymentInstallmentInput } from '@interfaces/payment.dto';
import type { DeliveryDayInput } from '@interfaces/delivery.dto';
import type { SaleBilling } from '@models/sale.model';
import type {
  CalculatePackageDaysDto,
  ChangeSaleAmountDto,
  CancelDeliveryDto,
  CalculatePackageDaysResultDto,
  PackagePricingDto,
} from '@interfaces/package-builder.dto';

/** Days-of-week (0=Sun..6=Sat) that each `week` pattern SKIPS. */
const SKIP_DOW: Record<PatientWeek, number[]> = {
  LD: [], // Lun–Dom (every day)
  LS: [0], // Lun–Sáb (skip Sunday)
  LV: [0, 6], // Lun–Vie (skip Sat + Sun)
};

/** Delivery days in one billing week per `week` pattern. */
const WEEK_SIZE: Record<PatientWeek, number> = { LD: 7, LS: 6, LV: 5 };

class PackageBuilderService {
  private resolveWeek = (week: PatientWeek | null | undefined): PatientWeek => week ?? 'LV';

  private isValidDay = (date: Date, week: PatientWeek): boolean =>
    !SKIP_DOW[week].includes(getDay(date));

  /** Generate `count` delivery dates from `startDate`, skipping per `week`. */
  private generateDays = (startDate: string, count: number, week: PatientWeek): string[] => {
    const days: string[] = [];
    let cursor = parseISO(startDate);
    let guard = 0;
    while (days.length < count && guard < count * 10 + 366) {
      if (this.isValidDay(cursor, week)) days.push(format(cursor, 'yyyy-MM-dd'));
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    return days;
  };

  /** First valid delivery day strictly AFTER `date`. */
  private nextValidDay = (date: string, week: PatientWeek): string => {
    let cursor = addDays(parseISO(date), 1);
    let guard = 0;
    while (!this.isValidDay(cursor, week) && guard < 366) {
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    return format(cursor, 'yyyy-MM-dd');
  };

  /** Chunk size (delivery days per installment) for a billing cadence. */
  private chunkSize = (billing: SaleBilling, week: PatientWeek, days: number): number => {
    const size = WEEK_SIZE[week];
    switch (billing) {
      case 'semanal': return size;
      case 'quincenal': return size * 2;
      case 'mensual':
      case 'diario':
      default: return days; // one installment covering all days
    }
  };

  /** Split `total` into `n` amounts (rounded to cents) that sum exactly to total. */
  private splitAmount = (total: number, n: number): number[] => {
    if (n <= 0) return [];
    const cents = Math.round(total * 100);
    const base = Math.floor(cents / n);
    const remainder = cents - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
  };

  private computePricing = (
    pricePerDay: number,
    days: number,
    billing: SaleBilling,
    pkg: { monthDiscount: number; coupleDiscount: number; especialDiscount: number },
    dto: CalculatePackageDaysDto,
    installmentCount: number,
  ): PackagePricingDto => {
    const subTotal = pricePerDay * days;
    let discountReason: PackagePricingDto['discountReason'] = 'none';
    let discountPercent = 0;

    if (billing === 'mensual' && !dto.ignoreMonthlyDiscount && pkg.monthDiscount > 0) {
      discountReason = 'monthly';
      discountPercent = pkg.monthDiscount;
    } else if (dto.coupleDiscount && pkg.coupleDiscount > 0) {
      discountReason = 'couple';
      discountPercent = pkg.coupleDiscount;
    } else if (dto.especialDiscount && pkg.especialDiscount > 0) {
      discountReason = 'especial';
      discountPercent = pkg.especialDiscount;
    }

    const discountAmount = Math.round((subTotal * discountPercent) / 100 * 100) / 100;
    const total = Math.round((subTotal - discountAmount) * 100) / 100;
    return {
      subTotal: Math.round(subTotal * 100) / 100,
      discountReason,
      discountPercent,
      discountAmount,
      total,
      installmentCount,
      perDayAmount: Math.round((total / days) * 100) / 100,
    };
  };

  /**
   * POST /sales/calculate-package-and-days — the package builder. Generates the
   * delivery calendar, applies discount precedence, chunks days into installments
   * and persists Sale → Payments → DeliveryDays in one transaction.
   */
  calculatePackageAndDays = async (
    dto: CalculatePackageDaysDto,
    createdById: string | null,
  ): Promise<CalculatePackageDaysResultDto> => {
    if (dto.days < 1) throw new BadRequestError('days must be at least 1');

    const { saleId, pricing } = await withTransaction(async (transaction) => {
      const patient = await db.Patient.findByPk(dto.patientId, { transaction });
      if (!patient) throw new NotFoundError('Patient', dto.patientId);
      const pkg = await db.Package.findByPk(dto.packageId, { transaction });
      if (!pkg) throw new NotFoundError('Package', dto.packageId);

      const week = this.resolveWeek(patient.week);
      const dates = this.generateDays(dto.startDate, dto.days, week);

      // Overlap guard — reject double-booking a package day for the patient.
      const clash = await db.DeliveryDay.findOne({
        where: { patientId: dto.patientId, deliveryDate: { [Op.in]: dates }, type: 'package' },
        attributes: ['id', 'deliveryDate'],
        transaction,
      });
      if (clash) {
        throw new ConflictError(
          `Patient already has a package delivery on ${clash.deliveryDate}`,
        );
      }

      // Chunk into installments and price.
      const chunk = this.chunkSize(dto.billing, week, dto.days);
      const slices: string[][] = [];
      for (let i = 0; i < dates.length; i += chunk) slices.push(dates.slice(i, i + chunk));
      const pricingBreakdown = this.computePricing(
        +pkg.pricePerDay, dto.days, dto.billing, {
          monthDiscount: pkg.monthDiscount,
          coupleDiscount: pkg.coupleDiscount,
          especialDiscount: pkg.especialDiscount,
        }, dto, slices.length,
      );

      // Create the sale (composes SaleService building block).
      const sale = await SaleService.create({
        folio: dto.folio ?? null,
        patientId: dto.patientId,
        packageId: dto.packageId,
        type: 'package',
        totalAmount: pricingBreakdown.total,
        startDate: dto.startDate,
        days: dto.days,
        billing: dto.billing,
        discount: pricingBreakdown.discountAmount,
        paymentType: dto.paymentType ?? null,
        invoiceRequested: dto.invoiceRequested ?? false,
      }, createdById);

      // Payments — one per installment (due on its first delivery date).
      const paymentAmounts = this.splitAmount(pricingBreakdown.total, slices.length);
      const paymentInputs: PaymentInstallmentInput[] = slices.map((slice, i) => ({
        saleId: sale.id,
        patientId: dto.patientId,
        dueDate: slice[0] ?? dto.startDate,
        amount: paymentAmounts[i] ?? 0,
      }));
      const payments = await PaymentService.createMany(paymentInputs, transaction);

      // Map each date → its installment's payment id.
      const dayAmounts = this.splitAmount(pricingBreakdown.total, dates.length);
      const dateToPaymentId = new Map<string, string>();
      slices.forEach((slice, i) => {
        const paymentId = payments[i]?.id;
        if (paymentId) slice.forEach((d) => dateToPaymentId.set(d, paymentId));
      });

      const deliveryInputs: DeliveryDayInput[] = dates.map((date, i) => ({
        patientId: dto.patientId,
        saleId: sale.id,
        paymentId: dateToPaymentId.get(date) ?? null,
        packageId: dto.packageId,
        deliveryDate: date,
        amount: dayAmounts[i] ?? 0,
        type: 'package',
        hasMenu: false,
        authorized: false,
      }));
      await DeliveryDayService.createMany(deliveryInputs, transaction);

      // Activate the patient on first sale.
      if (patient.status !== 'activo') {
        await patient.update({ status: 'activo' }, { transaction });
      }

      logger.info('Package calculated', {
        saleId: sale.id, days: dates.length, installments: slices.length,
      });
      return { saleId: sale.id, pricing: pricingBreakdown };
    });

    const sale = await SaleService.findById(saleId);
    return { pricing, sale };
  };

  /**
   * POST /sales/change-amount — redistribute a new total across the sale's payments
   * and delivery days proportionally (equal split, drift-free to the cent).
   */
  changeAmount = async (dto: ChangeSaleAmountDto): Promise<SaleDto> => {
    await withTransaction(async (transaction) => {
      const sale = await db.Sale.findByPk(dto.saleId, { transaction });
      if (!sale) throw new NotFoundError('Sale', dto.saleId);

      await sale.update({ totalAmount: dto.totalAmount }, { transaction });

      const deliveries = await db.DeliveryDay.findAll({
        where: { saleId: dto.saleId }, order: [['deliveryDate', 'ASC']], transaction,
      });
      const dAmounts = this.splitAmount(dto.totalAmount, deliveries.length);
      await Promise.all(deliveries.map((d, i) => d.update({ amount: dAmounts[i] ?? 0 }, { transaction })));

      const payments = await db.Payment.findAll({
        where: { saleId: dto.saleId }, order: [['dueDate', 'ASC']], transaction,
      });
      const pAmounts = this.splitAmount(dto.totalAmount, payments.length);
      await Promise.all(payments.map((p, i) => p.update({ amount: pAmounts[i] ?? 0 }, { transaction })));

      logger.info('Sale amount changed', { saleId: dto.saleId, totalAmount: dto.totalAmount });
    });
    return SaleService.findById(dto.saleId);
  };

  /**
   * POST /delivery-days/cancel — reschedule: shift every delivery on/after the
   * target date forward by one valid day (respecting the patient's `week`),
   * appending a new trailing day, then resync each Payment.due_date to its earliest
   * remaining delivery.
   */
  cancelDelivery = async (dto: CancelDeliveryDto): Promise<SaleDto> => {
    const saleId = await withTransaction(async (transaction) => {
      const target = await db.DeliveryDay.findByPk(dto.deliveryDayId, { transaction });
      if (!target) throw new NotFoundError('DeliveryDay', dto.deliveryDayId);
      if (!target.saleId) throw new BadRequestError('Delivery day is not part of a package sale');

      const patient = await db.Patient.findByPk(target.patientId, { transaction });
      const week = this.resolveWeek(patient?.week);

      const affected = await db.DeliveryDay.findAll({
        where: { saleId: target.saleId, deliveryDate: { [Op.gte]: target.deliveryDate } },
        order: [['deliveryDate', 'ASC']],
        transaction,
      });

      const startFrom = this.nextValidDay(target.deliveryDate, week);
      const newDates = this.generateDays(startFrom, affected.length, week);
      await Promise.all(
        affected.map((d, i) => d.update({ deliveryDate: newDates[i] ?? d.deliveryDate }, { transaction })),
      );

      // Resync each payment's due date to its earliest remaining delivery.
      const payments = await db.Payment.findAll({
        where: { saleId: target.saleId }, transaction,
      });
      await Promise.all(payments.map(async (pay) => {
        const earliest = await db.DeliveryDay.findOne({
          where: { paymentId: pay.id },
          order: [['deliveryDate', 'ASC']],
          attributes: ['deliveryDate'],
          transaction,
        });
        if (earliest && earliest.deliveryDate !== pay.dueDate) {
          await pay.update({ dueDate: earliest.deliveryDate }, { transaction });
        }
      }));

      logger.info('Delivery rescheduled', {
        deliveryDayId: dto.deliveryDayId, saleId: target.saleId, shifted: affected.length,
      });
      return target.saleId;
    });
    return SaleService.findById(saleId);
  };
}

export default new PackageBuilderService();

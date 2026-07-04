import { Op, Includeable, Transaction } from 'sequelize';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { PaymentInstance } from '@models/payment.model';
import { WhereClause } from '@interfaces/base.dto';
import { PatientRefDto } from '@interfaces/refs.dto';
import {
  UpdatePaymentDto,
  PaymentDto,
  PaymentFilterDto,
  PaymentListDto,
  PaymentInstallmentInput,
} from '@interfaces/payment.dto';

class PaymentService {
  private patientInclude = (): Includeable => ({
    model: db.Patient,
    as: 'patient',
    attributes: ['id', 'firstName', 'lastName'],
  });

  findAll = async (filters: PaymentFilterDto = {}): Promise<PaymentListDto> => {
    const {
      searchText, patientId, saleId, paid, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) where.folio = { [Op.iLike]: `%${searchText}%` };
    if (patientId) where.patientId = patientId;
    if (saleId) where.saleId = saleId;
    if (typeof paid === 'boolean') where.paid = paid;

    const { count, rows } = await db.Payment.findAndCountAll({
      where,
      include: [this.patientInclude()],
      limit,
      offset,
      order: [['dueDate', 'ASC']],
      distinct: true,
    });

    return { rows: rows.map((p) => this.toDto(p)), count: +count };
  };

  findById = async (id: string): Promise<PaymentDto> => {
    const payment = await db.Payment.findByPk(id, { include: [this.patientInclude()] });
    if (!payment) throw new NotFoundError('Payment', id);
    return this.toDto(payment);
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<PaymentDto> => {
    const payment = await db.Payment.findByPk(id, {
      include: [this.patientInclude()], transaction,
    });
    if (!payment) throw new NotFoundError('Payment', id);
    return this.toDto(payment);
  };

  /** Register a pago: apply method/note/amount and stamp paid_at when paid flips true. */
  update = async (id: string, dto: UpdatePaymentDto): Promise<PaymentDto> =>
    withTransaction(async (transaction) => {
      const payment = await db.Payment.findByPk(id, { transaction });
      if (!payment) throw new NotFoundError('Payment', id);

      const { note, paid, ...rest } = dto;
      await payment.update({
        ...rest,
        ...(note !== undefined ? { note: note === '' ? null : note } : {}),
        ...(paid !== undefined
          ? { paid, paidAt: paid ? (payment.paid ? payment.paidAt : new Date()) : null }
          : {}),
      }, { transaction });
      logger.info('Payment updated', { paymentId: id });

      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Payment.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Payment', id);
      logger.info('Payment deleted', { paymentId: id });
    });

  /**
   * Building block: bulk-create the installment schedule for a sale. Composed by the
   * orchestrator's calculate-package-and-days after the sale is created.
   */
  createMany = async (
    entries: PaymentInstallmentInput[],
    transaction?: Transaction,
  ): Promise<PaymentInstance[]> =>
    db.Payment.bulkCreate(
      entries.map((e) => ({
        folio: e.folio ?? null,
        saleId: e.saleId,
        patientId: e.patientId,
        dueDate: e.dueDate,
        amount: e.amount,
      })),
      { transaction, returning: true },
    );

  /** Public mapper — reused by SaleService to embed payments in a sale detail. */
  toDto = (p: PaymentInstance): PaymentDto => {
    const patient = p.get('patient') as PatientRefDto | null | undefined;
    return {
      id: p.id,
      folio: p.folio ?? null,
      saleId: p.saleId,
      patientId: p.patientId,
      patient: patient
        ? { id: patient.id, firstName: patient.firstName, lastName: patient.lastName }
        : null,
      dueDate: p.dueDate,
      amount: +p.amount,
      method: p.method ?? null,
      paid: p.paid,
      paidAt: p.paidAt == null ? null : new Date(p.paidAt).toISOString(),
      note: p.note ?? null,
      agingDays: differenceInCalendarDays(new Date(), parseISO(p.dueDate)),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  };
}

export default new PaymentService();

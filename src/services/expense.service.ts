import { Op, Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError, BadRequestError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { ExpenseInstance } from '@models/expense.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseDto,
  ExpenseFilterDto,
  ExpenseListDto,
  BeneficiaryListDto,
} from '@interfaces/expense.dto';

class ExpenseService {
  private beneficiaryInclude = (): Includeable => ({
    model: db.Beneficiary,
    as: 'beneficiary',
    attributes: ['id', 'name', 'createdAt'],
  });

  private employeeInclude = (): Includeable => ({
    model: db.Employee,
    as: 'employee',
    attributes: ['id', 'firstName', 'lastName', 'position'],
  });

  findAll = async (filters: ExpenseFilterDto = {}): Promise<ExpenseListDto> => {
    const {
      searchText, type, beneficiaryId, startDate, endDate, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) where.concept = { [Op.iLike]: `%${searchText}%` };
    if (type) where.type = type;
    if (beneficiaryId) where.beneficiaryId = beneficiaryId;
    if (startDate && endDate) where.expenseDate = { [Op.between]: [startDate, endDate] };
    else if (startDate) where.expenseDate = { [Op.gte]: startDate };
    else if (endDate) where.expenseDate = { [Op.lte]: endDate };

    const { count, rows } = await db.Expense.findAndCountAll({
      where,
      include: [this.beneficiaryInclude(), this.employeeInclude()],
      limit,
      offset,
      order: [['expenseDate', 'DESC'], ['createdAt', 'DESC']],
    });

    // Sum over the FULL filtered set (independent of the current page).
    const total = await db.Expense.sum('totalAmount', { where });

    return { rows: rows.map((e) => this.toDto(e)), count: +count, total: +(total ?? 0) };
  };

  findById = async (id: string): Promise<ExpenseDto> => {
    const expense = await db.Expense.findByPk(id, {
      include: [this.beneficiaryInclude(), this.employeeInclude()],
    });
    if (!expense) throw new NotFoundError('Expense', id);
    return this.toDto(expense);
  };

  create = async (dto: CreateExpenseDto, userId: string): Promise<ExpenseDto> =>
    withTransaction(async (transaction) => {
      let beneficiaryId: string | null = null;
      let employeeId: string | null = null;

      if (dto.type === 'nomina') {
        if (!dto.employeeId) throw new BadRequestError('employeeId is required for nómina expenses');
        const employee = await db.Employee.findByPk(dto.employeeId, { transaction });
        if (!employee) throw new NotFoundError('Employee', dto.employeeId);
        ({ employeeId } = dto);
      } else if (dto.beneficiary) {
        beneficiaryId = await this.findOrCreateBeneficiary(dto.beneficiary, transaction);
      }

      const expense = await db.Expense.create({
        folio: dto.folio ?? null,
        beneficiaryId,
        concept: dto.concept,
        totalAmount: dto.totalAmount,
        expenseDate: dto.expenseDate,
        type: dto.type,
        employeeId,
        comments: dto.comments ?? null,
        createdById: userId,
      }, { transaction });

      logger.info('Expense created', { expenseId: expense.id });
      return this.findByIdTx(expense.id, transaction);
    });

  update = async (id: string, dto: UpdateExpenseDto): Promise<ExpenseDto> =>
    withTransaction(async (transaction) => {
      const expense = await db.Expense.findByPk(id, { transaction });
      if (!expense) throw new NotFoundError('Expense', id);

      const { beneficiary, employeeId, ...scalarFields } = dto;
      const effectiveType = dto.type ?? expense.type;

      await expense.update(scalarFields, { transaction });

      if (effectiveType === 'nomina') {
        if (employeeId !== undefined || dto.type !== undefined) {
          const targetEmployeeId = employeeId ?? expense.employeeId ?? null;
          if (targetEmployeeId) {
            const employee = await db.Employee.findByPk(targetEmployeeId, { transaction });
            if (!employee) throw new NotFoundError('Employee', targetEmployeeId);
          }
          await expense.update({ employeeId: targetEmployeeId, beneficiaryId: null }, { transaction });
        }
      } else if (beneficiary !== undefined || dto.type !== undefined) {
        let targetBeneficiaryId = expense.beneficiaryId ?? null;
        if (beneficiary !== undefined) {
          targetBeneficiaryId = beneficiary
            ? await this.findOrCreateBeneficiary(beneficiary, transaction)
            : null;
        }
        await expense.update({ beneficiaryId: targetBeneficiaryId, employeeId: null }, { transaction });
      }

      logger.info('Expense updated', { expenseId: id });
      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Expense.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Expense', id);
      logger.info('Expense deleted', { expenseId: id });
    });

  listBeneficiaries = async (): Promise<BeneficiaryListDto> => {
    const { count, rows } = await db.Beneficiary.findAndCountAll({ order: [['name', 'ASC']] });
    return {
      rows: rows.map((b) => ({ id: b.id, name: b.name, createdAt: b.createdAt })),
      count: +count,
    };
  };

  private findOrCreateBeneficiary = async (name: string, transaction: Transaction): Promise<string> => {
    const trimmed = name.trim();
    const [beneficiary] = await db.Beneficiary.findOrCreate({
      where: { name: trimmed },
      defaults: { name: trimmed },
      transaction,
    });
    return beneficiary.id;
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<ExpenseDto> => {
    const expense = await db.Expense.findByPk(id, {
      include: [this.beneficiaryInclude(), this.employeeInclude()],
      transaction,
    });
    if (!expense) throw new NotFoundError('Expense', id);
    return this.toDto(expense);
  };

  private toDto = (e: ExpenseInstance): ExpenseDto => ({
    id: e.id,
    folio: e.folio ?? null,
    beneficiary: e.beneficiary
      ? { id: e.beneficiary.id, name: e.beneficiary.name, createdAt: e.beneficiary.createdAt }
      : null,
    concept: e.concept,
    totalAmount: +e.totalAmount,
    expenseDate: e.expenseDate,
    type: e.type,
    employee: e.employee
      ? {
          id: e.employee.id,
          firstName: e.employee.firstName,
          lastName: e.employee.lastName,
          position: e.employee.position,
        }
      : null,
    comments: e.comments ?? null,
    createdById: e.createdById ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export default new ExpenseService();

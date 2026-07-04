import { Op } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { EmployeeInstance } from '@models/employee.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeDto,
  EmployeeFilterDto,
  EmployeeListDto,
} from '@interfaces/employee.dto';

class EmployeeService {
  findAll = async (filters: EmployeeFilterDto = {}): Promise<EmployeeListDto> => {
    const {
      searchText, position, active, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${searchText}%` } },
        { lastName: { [Op.iLike]: `%${searchText}%` } },
        { email: { [Op.iLike]: `%${searchText}%` } },
      ];
    }
    if (position) where.position = position;
    if (typeof active === 'boolean') where.active = active;

    const { count, rows } = await db.Employee.findAndCountAll({
      where,
      limit,
      offset,
      order: [['firstName', 'ASC'], ['lastName', 'ASC']],
    });

    // Nómina base: sum of quincenal salary over the ACTIVE roster (paging-independent).
    const payrollTotal = await db.Employee.sum('salaryQuincenal', { where: { active: true } });

    return { rows: rows.map((e) => this.toDto(e)), count: +count, payrollTotal: +(payrollTotal ?? 0) };
  };

  findById = async (id: string): Promise<EmployeeDto> => {
    const employee = await db.Employee.findByPk(id);
    if (!employee) throw new NotFoundError('Employee', id);
    return this.toDto(employee);
  };

  create = async (dto: CreateEmployeeDto): Promise<EmployeeDto> =>
    withTransaction(async (transaction) => {
      const employee = await db.Employee.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        position: dto.position,
        salaryQuincenal: dto.salaryQuincenal,
        lastPaymentDate: dto.lastPaymentDate ?? null,
        userId: dto.userId ?? null,
        active: dto.active ?? true,
      }, { transaction });
      logger.info('Employee created', { employeeId: employee.id });
      return this.toDto(employee);
    });

  update = async (id: string, dto: UpdateEmployeeDto): Promise<EmployeeDto> =>
    withTransaction(async (transaction) => {
      const employee = await db.Employee.findByPk(id, { transaction });
      if (!employee) throw new NotFoundError('Employee', id);
      await employee.update(dto, { transaction });
      logger.info('Employee updated', { employeeId: id });
      return this.toDto(employee);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Employee.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Employee', id);
      logger.info('Employee deleted', { employeeId: id });
    });

  private toDto = (e: EmployeeInstance): EmployeeDto => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    position: e.position,
    salaryQuincenal: +e.salaryQuincenal,
    lastPaymentDate: e.lastPaymentDate ?? null,
    userId: e.userId ?? null,
    active: e.active,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export default new EmployeeService();

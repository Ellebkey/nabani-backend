import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { CalorieLevelInstance } from '@models/calorie-level.model';
import {
  CreateCalorieLevelDto, UpdateCalorieLevelDto, CalorieLevelDto, CalorieLevelListDto,
} from '@interfaces/calorie-level.dto';

class CalorieLevelService {
  findAll = async (): Promise<CalorieLevelListDto> => {
    const { count, rows } = await db.CalorieLevel.findAndCountAll({
      order: [['sortOrder', 'ASC'], ['kcal', 'ASC']],
    });
    return { rows: rows.map((c) => this.toDto(c)), count: +count };
  };

  findById = async (id: string): Promise<CalorieLevelDto> => {
    const level = await db.CalorieLevel.findByPk(id);
    if (!level) throw new NotFoundError('CalorieLevel', id);
    return this.toDto(level);
  };

  create = async (dto: CreateCalorieLevelDto): Promise<CalorieLevelDto> =>
    withTransaction(async (transaction) => {
      const level = await db.CalorieLevel.create({
        kcal: dto.kcal,
        label: dto.label,
        sortOrder: dto.sortOrder ?? dto.kcal,
      }, { transaction });
      logger.info('CalorieLevel created', { calorieLevelId: level.id });
      return this.toDto(level);
    });

  update = async (id: string, dto: UpdateCalorieLevelDto): Promise<CalorieLevelDto> =>
    withTransaction(async (transaction) => {
      const level = await db.CalorieLevel.findByPk(id, { transaction });
      if (!level) throw new NotFoundError('CalorieLevel', id);
      await level.update(dto, { transaction });
      return this.toDto(level);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.CalorieLevel.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('CalorieLevel', id);
    });

  private toDto = (c: CalorieLevelInstance): CalorieLevelDto => ({
    id: c.id,
    kcal: c.kcal,
    label: c.label,
    sortOrder: c.sortOrder,
    active: c.active,
  });
}

export default new CalorieLevelService();

import { Op, Includeable } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { IngredientInstance } from '@models/ingredient.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  IngredientDto,
  IngredientFilterDto,
  IngredientListDto,
} from '@interfaces/ingredient.dto';

class IngredientService {
  private diseaseInclude = (): Includeable => ({
    model: db.Disease,
    as: 'diseases',
    through: { attributes: [] },
    attributes: ['id', 'key', 'name'],
  });

  findAll = async (filters: IngredientFilterDto = {}): Promise<IngredientListDto> => {
    const {
      searchText, foodGroup, diseaseId, active, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) where.name = { [Op.iLike]: `%${searchText}%` };
    if (foodGroup) where.foodGroup = foodGroup;
    if (typeof active === 'boolean') where.active = active;

    // When filtering by disease, resolve the matching ingredient ids first so the
    // returned rows still carry their FULL disease list (not just the filtered one).
    if (diseaseId) {
      const links = await db.IngredientDisease.findAll({ where: { diseaseId }, attributes: ['ingredientId'] });
      where.id = { [Op.in]: links.map((l) => l.ingredientId) };
    }

    const { count, rows } = await db.Ingredient.findAndCountAll({
      where,
      include: [this.diseaseInclude()],
      limit,
      offset,
      order: [['name', 'ASC']],
      distinct: true,
    });

    return { rows: rows.map((i) => this.toDto(i)), count: +count };
  };

  findById = async (id: string): Promise<IngredientDto> => {
    const ingredient = await db.Ingredient.findByPk(id, { include: [this.diseaseInclude()] });
    if (!ingredient) throw new NotFoundError('Ingredient', id);
    return this.toDto(ingredient);
  };

  create = async (dto: CreateIngredientDto): Promise<IngredientDto> =>
    withTransaction(async (transaction) => {
      const ingredient = await db.Ingredient.create({
        name: dto.name,
        foodGroup: dto.foodGroup,
        baseUnit: dto.baseUnit,
        baseQuantity: dto.baseQuantity,
        lastPrice: dto.lastPrice ?? null,
      }, { transaction });

      await this.setDiseases(ingredient.id, dto.diseaseIds ?? [], transaction);
      logger.info('Ingredient created', { ingredientId: ingredient.id });

      return this.findByIdTx(ingredient.id, transaction);
    });

  update = async (id: string, dto: UpdateIngredientDto): Promise<IngredientDto> =>
    withTransaction(async (transaction) => {
      const ingredient = await db.Ingredient.findByPk(id, { transaction });
      if (!ingredient) throw new NotFoundError('Ingredient', id);

      const { diseaseIds, ...fields } = dto;
      await ingredient.update(fields, { transaction });
      if (diseaseIds) await this.setDiseases(id, diseaseIds, transaction);

      logger.info('Ingredient updated', { ingredientId: id });
      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      await db.IngredientDisease.destroy({ where: { ingredientId: id }, transaction });
      const deleted = await db.Ingredient.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Ingredient', id);
      logger.info('Ingredient deleted', { ingredientId: id });
    });

  private setDiseases = async (ingredientId: string, diseaseIds: string[], transaction: import('sequelize').Transaction): Promise<void> => {
    await db.IngredientDisease.destroy({ where: { ingredientId }, transaction });
    if (diseaseIds.length) {
      await db.IngredientDisease.bulkCreate(
        diseaseIds.map((diseaseId) => ({ ingredientId, diseaseId })),
        { transaction },
      );
    }
  };

  private findByIdTx = async (id: string, transaction: import('sequelize').Transaction): Promise<IngredientDto> => {
    const ingredient = await db.Ingredient.findByPk(id, { include: [this.diseaseInclude()], transaction });
    if (!ingredient) throw new NotFoundError('Ingredient', id);
    return this.toDto(ingredient);
  };

  private toDto = (i: IngredientInstance): IngredientDto => ({
    id: i.id,
    name: i.name,
    foodGroup: i.foodGroup,
    baseUnit: i.baseUnit,
    baseQuantity: +i.baseQuantity,
    lastPrice: i.lastPrice == null ? null : +i.lastPrice,
    active: i.active,
    diseases: (i.diseases ?? []).map((d) => ({ id: d.id, key: d.key, name: d.name })),
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  });
}

export default new IngredientService();

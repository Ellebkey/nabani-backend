import { Op, Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { DishInstance } from '@models/dish.model';
import { DishIngredientInstance } from '@models/dish-ingredient.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateDishDto,
  CreateDishIngredientDto,
  UpdateDishDto,
  DishDto,
  DishIngredientDto,
  DishFilterDto,
  DishListDto,
} from '@interfaces/dish.dto';

class DishService {
  private ingredientsInclude = (): Includeable => ({
    model: db.DishIngredient,
    as: 'ingredients',
    include: [
      {
        model: db.Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'foodGroup', 'baseUnit'],
      },
      {
        model: db.DishIngredientPortion,
        as: 'portions',
        include: [{
          model: db.CalorieLevel,
          as: 'calorieLevel',
          attributes: ['id', 'kcal', 'label'],
        }],
      },
    ],
  });

  findAll = async (filters: DishFilterDto = {}): Promise<DishListDto> => {
    const {
      searchText, mealTime, active, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (searchText) where.name = { [Op.iLike]: `%${searchText}%` };
    if (mealTime) where.mealTime = mealTime;
    if (typeof active === 'boolean') where.active = active;

    const { count, rows } = await db.Dish.findAndCountAll({
      where,
      include: [this.ingredientsInclude()],
      limit,
      offset,
      order: [['name', 'ASC']],
      distinct: true,
    });

    return { rows: rows.map((d) => this.toDto(d)), count: +count };
  };

  findById = async (id: string): Promise<DishDto> => {
    const dish = await db.Dish.findByPk(id, { include: [this.ingredientsInclude()] });
    if (!dish) throw new NotFoundError('Dish', id);
    return this.toDto(dish);
  };

  create = async (dto: CreateDishDto): Promise<DishDto> =>
    withTransaction(async (transaction) => {
      const dish = await db.Dish.create({
        name: dto.name,
        mealTime: dto.mealTime,
      }, { transaction });

      await this.setIngredients(dish.id, dto.ingredients ?? [], transaction);
      logger.info('Dish created', { dishId: dish.id });

      return this.findByIdTx(dish.id, transaction);
    });

  update = async (id: string, dto: UpdateDishDto): Promise<DishDto> =>
    withTransaction(async (transaction) => {
      const dish = await db.Dish.findByPk(id, { transaction });
      if (!dish) throw new NotFoundError('Dish', id);

      const { ingredients, ...fields } = dto;
      await dish.update(fields, { transaction });
      if (ingredients) await this.setIngredients(id, ingredients, transaction);

      logger.info('Dish updated', { dishId: id });
      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      await this.clearIngredients(id, transaction);
      const deleted = await db.Dish.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Dish', id);
      logger.info('Dish deleted', { dishId: id });
    });

  private setIngredients = async (
    dishId: string,
    ingredients: CreateDishIngredientDto[],
    transaction: Transaction,
  ): Promise<void> => {
    await this.clearIngredients(dishId, transaction);

    await Promise.all(ingredients.map(async (ing, index) => {
      const dishIngredient = await db.DishIngredient.create({
        dishId,
        ingredientId: ing.ingredientId,
        baseQuantity: ing.baseQuantity,
        unit: ing.unit,
        position: ing.position ?? index,
      }, { transaction });

      const portions = ing.portions ?? [];
      if (portions.length) {
        await db.DishIngredientPortion.bulkCreate(
          portions.map((p) => ({
            dishIngredientId: dishIngredient.id,
            calorieLevelId: p.calorieLevelId,
            portions: p.portions,
          })),
          { transaction },
        );
      }
    }));
  };

  private clearIngredients = async (dishId: string, transaction: Transaction): Promise<void> => {
    const existing = await db.DishIngredient.findAll({
      where: { dishId }, attributes: ['id'], transaction,
    });
    const existingIds = existing.map((e) => e.id);
    if (existingIds.length) {
      await db.DishIngredientPortion.destroy({
        where: { dishIngredientId: { [Op.in]: existingIds } }, transaction,
      });
      await db.DishIngredient.destroy({ where: { dishId }, transaction });
    }
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<DishDto> => {
    const dish = await db.Dish.findByPk(id, {
      include: [this.ingredientsInclude()], transaction,
    });
    if (!dish) throw new NotFoundError('Dish', id);
    return this.toDto(dish);
  };

  private toIngredientDto = (di: DishIngredientInstance): DishIngredientDto => ({
    id: di.id,
    ingredientId: di.ingredientId,
    ingredient: di.ingredient
      ? {
          id: di.ingredient.id,
          name: di.ingredient.name,
          foodGroup: di.ingredient.foodGroup,
          baseUnit: di.ingredient.baseUnit,
        }
      : null,
    baseQuantity: +di.baseQuantity,
    unit: di.unit,
    position: di.position,
    portions: (di.portions ?? [])
      .slice()
      .sort((a, b) => (a.calorieLevel?.kcal ?? 0) - (b.calorieLevel?.kcal ?? 0))
      .map((p) => ({
        id: p.id,
        calorieLevelId: p.calorieLevelId,
        calorieLevel: p.calorieLevel
          ? { id: p.calorieLevel.id, kcal: p.calorieLevel.kcal, label: p.calorieLevel.label }
          : null,
        portions: +p.portions,
      })),
  });

  private toDto = (d: DishInstance): DishDto => ({
    id: d.id,
    name: d.name,
    mealTime: d.mealTime,
    usageCount: d.usageCount,
    active: d.active,
    ingredients: (d.ingredients ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((di) => this.toIngredientDto(di)),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  });
}

export default new DishService();

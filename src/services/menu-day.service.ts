import { Op, Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import DishService from '@services/dish.service';
import { MenuDayInstance } from '@models/menu-day.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreateMenuDayDto,
  CreateMenuDayMealDto,
  UpdateMenuDayDto,
  MenuDayDto,
  MenuDayFilterDto,
  MenuDayListDto,
} from '@interfaces/menu-day.dto';

class MenuDayService {
  private mealsInclude = (): Includeable => ({
    model: db.MenuDayMeal,
    as: 'meals',
    include: [{
      model: db.Dish,
      as: 'dish',
      attributes: ['id', 'name', 'mealTime', 'active'],
    }],
  });

  findAll = async (filters: MenuDayFilterDto = {}): Promise<MenuDayListDto> => {
    const {
      startDate, endDate, status, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (startDate && endDate) where.menuDate = { [Op.between]: [startDate, endDate] };
    else if (startDate) where.menuDate = { [Op.gte]: startDate };
    else if (endDate) where.menuDate = { [Op.lte]: endDate };
    if (status) where.status = status;

    const { count, rows } = await db.MenuDay.findAndCountAll({
      where,
      include: [this.mealsInclude()],
      limit,
      offset,
      order: [['menuDate', 'DESC']],
      distinct: true,
    });

    return { rows: rows.map((m) => this.toDto(m)), count: +count };
  };

  findById = async (id: string): Promise<MenuDayDto> => {
    const menuDay = await db.MenuDay.findByPk(id, { include: [this.mealsInclude()] });
    if (!menuDay) throw new NotFoundError('MenuDay', id);
    return this.withFullDishes(this.toDto(menuDay));
  };

  findByDate = async (date: string): Promise<MenuDayDto> => {
    const menuDay = await db.MenuDay.findOne({
      where: { menuDate: date }, include: [this.mealsInclude()],
    });
    if (!menuDay) throw new NotFoundError('MenuDay', date);
    return this.withFullDishes(this.toDto(menuDay));
  };

  /** Replaces each meal's light dish ref with the FULL dish (ingredients +
   *  per-level portions) so the Menú-del-día editor can render/edit portions. */
  private withFullDishes = async (dto: MenuDayDto): Promise<MenuDayDto> => {
    const meals = await Promise.all(dto.meals.map(async (meal) => {
      if (!meal.dishId) return meal;
      try {
        return { ...meal, dish: await DishService.findById(meal.dishId) };
      } catch {
        return meal;
      }
    }));
    return { ...dto, meals };
  };

  create = async (dto: CreateMenuDayDto, createdById: string | null): Promise<MenuDayDto> =>
    withTransaction(async (transaction) => {
      const menuDay = await db.MenuDay.create({
        menuDate: dto.menuDate,
        status: dto.status ?? 'borrador',
        createdById,
      }, { transaction });

      await this.setMeals(menuDay.id, dto.meals ?? [], transaction);
      logger.info('MenuDay created', { menuDayId: menuDay.id });

      return this.findByIdTx(menuDay.id, transaction);
    });

  update = async (id: string, dto: UpdateMenuDayDto): Promise<MenuDayDto> =>
    withTransaction(async (transaction) => {
      const menuDay = await db.MenuDay.findByPk(id, { transaction });
      if (!menuDay) throw new NotFoundError('MenuDay', id);

      const { meals, ...fields } = dto;
      await menuDay.update(fields, { transaction });
      if (meals) await this.setMeals(id, meals, transaction);

      logger.info('MenuDay updated', { menuDayId: id });
      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      await db.MenuDayMeal.destroy({ where: { menuDayId: id }, transaction });
      const deleted = await db.MenuDay.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('MenuDay', id);
      logger.info('MenuDay deleted', { menuDayId: id });
    });

  private setMeals = async (
    menuDayId: string,
    meals: CreateMenuDayMealDto[],
    transaction: Transaction,
  ): Promise<void> => {
    await db.MenuDayMeal.destroy({ where: { menuDayId }, transaction });
    if (meals.length) {
      await db.MenuDayMeal.bulkCreate(
        meals.map((m, index) => ({
          menuDayId,
          mealSlot: m.mealSlot,
          dishId: m.dishId ?? null,
          position: m.position ?? index,
        })),
        { transaction },
      );
    }
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<MenuDayDto> => {
    const menuDay = await db.MenuDay.findByPk(id, {
      include: [this.mealsInclude()], transaction,
    });
    if (!menuDay) throw new NotFoundError('MenuDay', id);
    return this.toDto(menuDay);
  };

  private toDto = (m: MenuDayInstance): MenuDayDto => ({
    id: m.id,
    menuDate: m.menuDate,
    status: m.status,
    createdById: m.createdById ?? null,
    meals: (m.meals ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((meal) => ({
        id: meal.id,
        mealSlot: meal.mealSlot,
        dishId: meal.dishId ?? null,
        dish: meal.dish
          ? {
            id: meal.dish.id,
            name: meal.dish.name,
            mealTime: meal.dish.mealTime,
            active: meal.dish.active,
          }
          : null,
        position: meal.position,
      })),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  });
}

export default new MenuDayService();

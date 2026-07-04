import { Op, Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { DeliveryDayInstance } from '@models/delivery-day.model';
import { DeliveryMealInstance, MealSlot } from '@models/delivery-meal.model';
import { DeliveryMealIngredientInstance } from '@models/delivery-meal-ingredient.model';
import { WhereClause } from '@interfaces/base.dto';
import { PatientRefDto } from '@interfaces/refs.dto';
import {
  UpdateDeliveryDayDto,
  DeliveryDayDto,
  DeliveryMealDto,
  DeliveryMealIngredientDto,
  DeliveryDayFilterDto,
  DeliveryDayListDto,
  DeliveryDayInput,
} from '@interfaces/delivery.dto';

const MEAL_SLOT_ORDER: Record<MealSlot, number> = {
  desayuno: 0, colacion1: 1, comida: 2, colacion2: 3, cena: 4,
};

class DeliveryDayService {
  private patientInclude = (): Includeable => ({
    model: db.Patient,
    as: 'patient',
    attributes: ['id', 'firstName', 'lastName'],
  });

  private menuDayInclude = (): Includeable => ({
    model: db.MenuDay,
    as: 'menuDay',
    attributes: ['id', 'menuDate', 'status'],
  });

  private packageInclude = (): Includeable => ({
    model: db.Package,
    as: 'package',
    attributes: ['id', 'code', 'displayLabel', 'pricePerDay'],
  });

  private mealsInclude = (): Includeable => ({
    model: db.DeliveryMeal,
    as: 'meals',
    include: [
      { model: db.Dish, as: 'dish', attributes: ['id', 'name'] },
      {
        model: db.DeliveryMealIngredient,
        as: 'ingredients',
        include: [
          { model: db.Ingredient, as: 'ingredient', attributes: ['id', 'name'] },
          { model: db.Ingredient, as: 'substitutedFrom', attributes: ['id', 'name'] },
        ],
      },
    ],
  });

  findAll = async (filters: DeliveryDayFilterDto = {}): Promise<DeliveryDayListDto> => {
    const {
      patientId, date, authorized, type, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (patientId) where.patientId = patientId;
    if (date) where.deliveryDate = date;
    if (typeof authorized === 'boolean') where.authorized = authorized;
    if (type) where.type = type;

    const { count, rows } = await db.DeliveryDay.findAndCountAll({
      where,
      include: [this.patientInclude(), this.menuDayInclude()],
      limit,
      offset,
      order: [['deliveryDate', 'ASC']],
      distinct: true,
    });

    return { rows: rows.map((d) => this.toDto(d)), count: +count };
  };

  /** All delivery days for one patient, chronologically (calendar view). */
  calendarDays = async (patientId: string): Promise<DeliveryDayListDto> => {
    const { count, rows } = await db.DeliveryDay.findAndCountAll({
      where: { patientId },
      include: [this.patientInclude(), this.menuDayInclude()],
      order: [['deliveryDate', 'ASC']],
    });
    return { rows: rows.map((d) => this.toDto(d)), count: +count };
  };

  findById = async (id: string): Promise<DeliveryDayDto> => {
    const day = await db.DeliveryDay.findByPk(id, {
      include: [
        this.patientInclude(),
        this.menuDayInclude(),
        this.packageInclude(),
        this.mealsInclude(),
      ],
    });
    if (!day) throw new NotFoundError('DeliveryDay', id);
    return this.toDto(day);
  };

  private findByIdTx = async (id: string, transaction: Transaction): Promise<DeliveryDayDto> => {
    const day = await db.DeliveryDay.findByPk(id, {
      include: [
        this.patientInclude(), this.menuDayInclude(), this.packageInclude(), this.mealsInclude(),
      ],
      transaction,
    });
    if (!day) throw new NotFoundError('DeliveryDay', id);
    return this.toDto(day);
  };

  update = async (id: string, dto: UpdateDeliveryDayDto): Promise<DeliveryDayDto> =>
    withTransaction(async (transaction) => {
      const day = await db.DeliveryDay.findByPk(id, { transaction });
      if (!day) throw new NotFoundError('DeliveryDay', id);

      const { status, ...rest } = dto;
      await day.update({
        ...rest,
        ...(status !== undefined ? { status: status === '' ? null : status } : {}),
      }, { transaction });
      logger.info('DeliveryDay updated', { deliveryDayId: id });

      return this.findByIdTx(id, transaction);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const exists = await db.DeliveryDay.findByPk(id, { attributes: ['id'], transaction });
      if (!exists) throw new NotFoundError('DeliveryDay', id);
      await this.deleteCascade(id, transaction);
      logger.info('DeliveryDay deleted', { deliveryDayId: id });
    });

  /**
   * Building block: delete a delivery day with its meals and meal ingredients in
   * dependency order. Reused by SaleService.delete when tearing down a sale.
   */
  deleteCascade = async (id: string, transaction: Transaction): Promise<void> => {
    const meals = await db.DeliveryMeal.findAll({
      where: { deliveryDayId: id }, attributes: ['id'], transaction,
    });
    const mealIds = meals.map((m) => m.id);
    if (mealIds.length) {
      await db.DeliveryMealIngredient.destroy({
        where: { deliveryMealId: { [Op.in]: mealIds } }, transaction,
      });
      await db.DeliveryMeal.destroy({ where: { deliveryDayId: id }, transaction });
    }
    await db.DeliveryDay.destroy({ where: { id }, transaction });
  };

  /**
   * Building block: bulk-create the delivery days generated for a sale/payment span.
   * Composed by the orchestrator's calculate-package-and-days.
   */
  createMany = async (
    entries: DeliveryDayInput[],
    transaction?: Transaction,
  ): Promise<DeliveryDayInstance[]> =>
    db.DeliveryDay.bulkCreate(
      entries.map((e) => ({
        patientId: e.patientId,
        saleId: e.saleId ?? null,
        paymentId: e.paymentId ?? null,
        packageId: e.packageId ?? null,
        menuDayId: e.menuDayId ?? null,
        deliveryDate: e.deliveryDate,
        amount: e.amount ?? 0,
        type: e.type,
        hasMenu: e.hasMenu ?? false,
        authorized: e.authorized ?? false,
        status: e.status ?? null,
      })),
      { transaction, returning: true },
    );

  private patientRef = (day: DeliveryDayInstance): PatientRefDto | null => {
    const p = day.get('patient') as PatientRefDto | null | undefined;
    return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName } : null;
  };

  private toMealIngredientDto = (
    mi: DeliveryMealIngredientInstance,
  ): DeliveryMealIngredientDto => ({
    id: mi.id,
    ingredientId: mi.ingredientId,
    ingredient: mi.ingredient ? { id: mi.ingredient.id, name: mi.ingredient.name } : null,
    portions: +mi.portions,
    conflictType: mi.conflictType ?? null,
    substitutedFromIngredientId: mi.substitutedFromIngredientId ?? null,
    substitutedFrom: mi.substitutedFrom
      ? { id: mi.substitutedFrom.id, name: mi.substitutedFrom.name }
      : null,
    eliminated: mi.eliminated,
    position: mi.position,
  });

  private toMealDto = (m: DeliveryMealInstance): DeliveryMealDto => ({
    id: m.id,
    deliveryDayId: m.deliveryDayId,
    mealSlot: m.mealSlot,
    dishId: m.dishId ?? null,
    dish: m.dish ? { id: m.dish.id, name: m.dish.name } : null,
    included: m.included,
    ingredients: (m.ingredients ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((mi) => this.toMealIngredientDto(mi)),
    createdAt: m.createdAt,
  });

  /** Public mapper — reused by SaleService to embed deliveries in a sale detail. */
  toDto = (d: DeliveryDayInstance): DeliveryDayDto => {
    const menuDay = d.menuDay
      ? { id: d.menuDay.id, menuDate: d.menuDay.menuDate, status: d.menuDay.status }
      : null;
    return {
      id: d.id,
      patientId: d.patientId,
      saleId: d.saleId ?? null,
      paymentId: d.paymentId ?? null,
      packageId: d.packageId ?? null,
      menuDayId: d.menuDayId ?? null,
      deliveryDate: d.deliveryDate,
      amount: +d.amount,
      type: d.type,
      hasMenu: d.hasMenu,
      authorized: d.authorized,
      status: d.status ?? null,
      patient: this.patientRef(d),
      package: d.package
        ? {
            id: d.package.id,
            code: d.package.code,
            displayLabel: d.package.displayLabel,
            pricePerDay: +d.package.pricePerDay,
          }
        : null,
      menuDay,
      meals: d.meals
        ? d.meals
            .slice()
            .sort((a, b) => (MEAL_SLOT_ORDER[a.mealSlot] ?? 0) - (MEAL_SLOT_ORDER[b.mealSlot] ?? 0))
            .map((m) => this.toMealDto(m))
        : undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  };
}

export default new DeliveryDayService();

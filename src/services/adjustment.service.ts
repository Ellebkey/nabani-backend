import { Op, QueryTypes, Includeable } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError, BadRequestError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import DeliveryDayService from '@services/delivery.service';
import { adjustmentsQueueSql } from '@queries/adjustment.queries';
import type {
  AdjustmentFilter,
  AdjustmentQueueDto,
  AdjustmentQueueItemDto,
  AdjustmentStatus,
  AdjustmentDetailDto,
  SwapSuggestionDto,
  SwapDto,
  EliminateDto,
  AuthorizeResultDto,
} from '@interfaces/adjustment.dto';

interface QueueRow {
  deliveryDayId: string;
  hasMenu: boolean;
  authorized: boolean;
  patientId: string;
  firstName: string;
  lastName: string;
  calorieLevelId: string | null;
  kcal: number | null;
  calorieLabel: string | null;
  packageId: string | null;
  packageCode: string | null;
  packageLabel: string | null;
  pricePerDay: string | null;
  preferenceConflicts: string;
  diseaseConflicts: string;
}

class AdjustmentService {
  /** GET /adjustments?date=&filter= — the review queue. */
  queue = async (date: string, filter: AdjustmentFilter = 'todos'): Promise<AdjustmentQueueDto> => {
    const rows = await db.sequelize.query<QueueRow>(adjustmentsQueueSql, {
      replacements: { date }, type: QueryTypes.SELECT,
    });

    const items: AdjustmentQueueItemDto[] = rows.map((r) => {
      const preferenceConflictCount = Number(r.preferenceConflicts);
      const diseaseConflictCount = Number(r.diseaseConflicts);
      const status: AdjustmentStatus = preferenceConflictCount > 0 ? 'conflicto' : 'listo';
      return {
        deliveryDayId: r.deliveryDayId,
        patient: { id: r.patientId, firstName: r.firstName, lastName: r.lastName },
        calorieLevel: r.calorieLevelId
          ? { id: r.calorieLevelId, kcal: Number(r.kcal), label: r.calorieLabel ?? '' }
          : null,
        package: r.packageId
          ? {
              id: r.packageId,
              code: r.packageCode ?? '',
              displayLabel: r.packageLabel ?? '',
              pricePerDay: Number(r.pricePerDay ?? 0),
            }
          : null,
        hasMenu: r.hasMenu,
        authorized: r.authorized,
        conflictCount: preferenceConflictCount + diseaseConflictCount,
        preferenceConflictCount,
        diseaseConflictCount,
        status,
      };
    });

    const filtered = items.filter((i) => {
      if (filter === 'listos') return i.status === 'listo';
      if (filter === 'conflictos') return i.status === 'conflicto';
      return true;
    });

    const listos = items.filter((i) => i.status === 'listo').length;
    return {
      date,
      rows: filtered,
      count: filtered.length,
      summary: { total: items.length, listos, conflictos: items.length - listos },
    };
  };

  /** GET /adjustments/:deliveryDayId — the resolved menu detail pane. */
  detail = async (deliveryDayId: string): Promise<AdjustmentDetailDto> => {
    const dd = await DeliveryDayService.findById(deliveryDayId);
    const patient = await db.Patient.findByPk(dd.patientId, {
      include: [
        { model: db.CalorieLevel, as: 'calorieLevel', attributes: ['id', 'kcal', 'label'] },
        {
          model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id', 'name'],
        },
        {
          model: db.Ingredient, as: 'preferences', through: { attributes: [] }, attributes: ['id', 'name'],
        },
      ],
    });
    if (!patient) throw new NotFoundError('Patient', dd.patientId);

    let preferenceConflictCount = 0;
    let diseaseConflictCount = 0;
    (dd.meals ?? []).forEach((m) => (m.ingredients ?? []).forEach((mi) => {
      if (mi.eliminated || !mi.conflictType) return;
      if (mi.conflictType === 'preference') preferenceConflictCount += 1;
      else diseaseConflictCount += 1;
    }));

    return {
      deliveryDayId,
      patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
      calorieLevel: patient.calorieLevel
        ? { id: patient.calorieLevel.id, kcal: patient.calorieLevel.kcal, label: patient.calorieLevel.label }
        : null,
      week: patient.week ?? null,
      package: dd.package ?? null,
      hasMenu: dd.hasMenu,
      authorized: dd.authorized,
      status: preferenceConflictCount > 0 ? 'conflicto' : 'listo',
      conflictCount: preferenceConflictCount + diseaseConflictCount,
      preferenceConflictCount,
      diseaseConflictCount,
      diseases: (patient.diseases ?? []).map((d) => ({ id: d.id, name: d.name })),
      preferences: (patient.preferences ?? []).map((i) => ({ id: i.id, name: i.name })),
      meals: dd.meals ?? [],
    };
  };

  /** GET /adjustments/:deliveryDayId/swap-suggestions?deliveryMealIngredientId= */
  swapSuggestions = async (
    deliveryDayId: string,
    deliveryMealIngredientId: string,
  ): Promise<SwapSuggestionDto[]> => {
    const mi = await this.loadMealIngredient(deliveryDayId, deliveryMealIngredientId, [
      { model: db.Ingredient, as: 'ingredient', attributes: ['id', 'name', 'foodGroup'] },
    ]);
    const current = mi.ingredient;
    if (!current) return [];

    const dd = await db.DeliveryDay.findByPk(deliveryDayId, { attributes: ['patientId'] });
    const patient = await db.Patient.findByPk(dd?.patientId ?? '', {
      include: [{
        model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id'],
      }],
    });
    const diseaseSet = new Set((patient?.diseases ?? []).map((d) => d.id));

    const candidates = await db.Ingredient.findAll({
      where: { foodGroup: current.foodGroup, active: true, id: { [Op.ne]: current.id } },
      include: [{
        model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id'],
      }],
      order: [['name', 'ASC']],
    });

    return candidates
      .filter((c) => !(c.diseases ?? []).some((d) => diseaseSet.has(d.id)))
      .map((c) => ({
        id: c.id,
        name: c.name,
        foodGroup: c.foodGroup,
        baseUnit: c.baseUnit,
        baseQuantity: +c.baseQuantity,
      }));
  };

  /** POST /adjustments/:deliveryDayId/swap */
  swap = async (deliveryDayId: string, dto: SwapDto): Promise<AdjustmentDetailDto> => {
    await withTransaction(async (transaction) => {
      const mi = await this.loadMealIngredient(deliveryDayId, dto.deliveryMealIngredientId, [], transaction);
      const original = mi.substitutedFromIngredientId ?? mi.ingredientId;
      await mi.update({
        substitutedFromIngredientId: original,
        ingredientId: dto.newIngredientId,
        conflictType: null,
      }, { transaction });
      logger.info('Ingredient swapped', { deliveryDayId, deliveryMealIngredientId: dto.deliveryMealIngredientId });
    });
    return this.detail(deliveryDayId);
  };

  /** POST /adjustments/:deliveryDayId/eliminate */
  eliminate = async (deliveryDayId: string, dto: EliminateDto): Promise<AdjustmentDetailDto> => {
    await withTransaction(async (transaction) => {
      const mi = await this.loadMealIngredient(deliveryDayId, dto.deliveryMealIngredientId, [], transaction);
      await mi.update({ eliminated: true, portions: 0, conflictType: null }, { transaction });
      logger.info('Ingredient eliminated', { deliveryDayId, deliveryMealIngredientId: dto.deliveryMealIngredientId });
    });
    return this.detail(deliveryDayId);
  };

  /** POST /authorize { deliveryDayIds: [] } — bulk authorize (adeudo does NOT block). */
  authorize = async (deliveryDayIds: string[]): Promise<AuthorizeResultDto> => {
    if (!deliveryDayIds.length) return { authorized: 0 };
    const [affected] = await db.DeliveryDay.update(
      { authorized: true },
      { where: { id: { [Op.in]: deliveryDayIds } } },
    );
    logger.info('Deliveries authorized', { count: affected });
    return { authorized: affected };
  };

  /** Load a delivery_meal_ingredient and assert it belongs to the delivery day. */
  private loadMealIngredient = async (
    deliveryDayId: string,
    deliveryMealIngredientId: string,
    extraIncludes: Includeable[] = [],
    transaction?: import('sequelize').Transaction,
  ) => {
    const mi = await db.DeliveryMealIngredient.findByPk(deliveryMealIngredientId, {
      include: [
        { model: db.DeliveryMeal, as: 'deliveryMeal', attributes: ['id', 'deliveryDayId'] },
        ...extraIncludes,
      ],
      transaction,
    });
    if (!mi) throw new NotFoundError('DeliveryMealIngredient', deliveryMealIngredientId);
    const meal = mi.get('deliveryMeal') as { deliveryDayId: string } | undefined;
    if (!meal || meal.deliveryDayId !== deliveryDayId) {
      throw new BadRequestError('Ingredient does not belong to this delivery day');
    }
    return mi;
  };
}

export default new AdjustmentService();

import { Op, Includeable, Transaction } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import type { MealSlot } from '@models/delivery-meal.model';
import type { PackageInstance } from '@models/package.model';
import type { PatientInstance } from '@models/patient.model';
import type { MenuDayInstance } from '@models/menu-day.model';
import type { ConflictType } from '@models/delivery-meal-ingredient.model';
import type { ApplyMenuSummaryDto } from '@interfaces/adjustment.dto';

/** meal_slot → the package `includes_*` flag that gates it. */
const SLOT_INCLUDE: Record<MealSlot, keyof PackageInstance> = {
  desayuno: 'includesDesayuno',
  colacion1: 'includesSnack1',
  comida: 'includesComida',
  colacion2: 'includesSnack2',
  cena: 'includesCena',
};

class MenuResolutionService {
  /** Full menú del día → dishes → ingredients (with per-level portions + diseases). */
  private menuDayInclude = (): Includeable[] => ([
    {
      model: db.MenuDayMeal,
      as: 'meals',
      include: [{
        model: db.Dish,
        as: 'dish',
        include: [{
          model: db.DishIngredient,
          as: 'ingredients',
          include: [
            {
              model: db.Ingredient,
              as: 'ingredient',
              include: [{
                model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id'],
              }],
            },
            { model: db.DishIngredientPortion, as: 'portions' },
          ],
        }],
      }],
    },
  ]);

  private patientInclude = (): Includeable => ({
    model: db.Patient,
    as: 'patient',
    include: [
      {
        model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id'],
      },
      {
        model: db.Ingredient, as: 'preferences', through: { attributes: [] }, attributes: ['id'],
      },
      { model: db.CalorieLevel, as: 'calorieLevel', attributes: ['id', 'kcal'] },
    ],
  });

  /** POST /menu-days/:id/apply */
  applyByMenuDayId = async (menuDayId: string): Promise<ApplyMenuSummaryDto> => {
    const menuDay = await db.MenuDay.findByPk(menuDayId, { include: this.menuDayInclude() });
    if (!menuDay) throw new NotFoundError('MenuDay', menuDayId);
    return this.apply(menuDay);
  };

  /** POST /apply-menu-to-patients { date } */
  applyByDate = async (date: string): Promise<ApplyMenuSummaryDto> => {
    const menuDay = await db.MenuDay.findOne({
      where: { menuDate: date }, include: this.menuDayInclude(),
    });
    if (!menuDay) throw new NotFoundError('MenuDay', date);
    return this.apply(menuDay);
  };

  private apply = async (menuDay: MenuDayInstance): Promise<ApplyMenuSummaryDto> =>
    withTransaction(async (transaction) => {
      const date = menuDay.menuDate;

      const deliveries = await db.DeliveryDay.findAll({
        where: { deliveryDate: date, type: 'package' },
        include: [
          this.patientInclude(),
          { model: db.Package, as: 'package' },
        ],
        transaction,
      });

      let applied = 0;
      let autoReady = 0;
      let withConflicts = 0;
      let withDiseaseFlags = 0;

      for (const dd of deliveries) {
        const pkg = dd.package;
        const patient = dd.get('patient') as PatientInstance | undefined;
        if (!pkg || !patient) continue;

        // eslint-disable-next-line no-await-in-loop
        await this.clearMeals(dd.id, transaction);

        const prefSet = new Set((patient.preferences ?? []).map((i) => i.id));
        const diseaseSet = new Set((patient.diseases ?? []).map((d) => d.id));
        const calorieLevelId = patient.calorieLevelId ?? null;

        let prefConflicts = 0;
        let diseaseConflicts = 0;

        for (const meal of menuDay.meals ?? []) {
          const includeFlag = SLOT_INCLUDE[meal.mealSlot];
          if (!pkg[includeFlag]) continue; // meal not in this package
          const { dish } = meal;
          if (!dish) continue;

          // eslint-disable-next-line no-await-in-loop
          const deliveryMeal = await db.DeliveryMeal.create({
            deliveryDayId: dd.id,
            mealSlot: meal.mealSlot,
            dishId: dish.id,
            included: true,
          }, { transaction });

          const dishIngredients = (dish.ingredients ?? [])
            .slice()
            .sort((a, b) => a.position - b.position);

          const rows = dishIngredients.map((di, index) => {
            const ing = di.ingredient;
            const portion = (di.portions ?? []).find((p) => p.calorieLevelId === calorieLevelId);
            const portions = portion ? +portion.portions : 0;

            let conflictType: ConflictType | null = null;
            if (ing && prefSet.has(ing.id)) {
              conflictType = 'preference';
              prefConflicts += 1;
            } else if (ing && (ing.diseases ?? []).some((d) => diseaseSet.has(d.id))) {
              conflictType = 'disease';
              diseaseConflicts += 1;
            }

            return {
              deliveryMealId: deliveryMeal.id,
              ingredientId: ing?.id ?? di.ingredientId,
              portions,
              conflictType,
              position: index,
            };
          });

          if (rows.length) {
            // eslint-disable-next-line no-await-in-loop
            await db.DeliveryMealIngredient.bulkCreate(rows, { transaction });
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await dd.update({
          hasMenu: true,
          menuDayId: menuDay.id,
          status: prefConflicts > 0 ? 'conflicto' : 'listo',
        }, { transaction });

        applied += 1;
        if (prefConflicts > 0) withConflicts += 1;
        else autoReady += 1;
        if (diseaseConflicts > 0) withDiseaseFlags += 1;
      }

      logger.info('Menu applied to patients', { date, applied, autoReady });
      return {
        date, menuDayId: menuDay.id, applied, autoReady, withConflicts, withDiseaseFlags,
      };
    });

  /** Remove the resolved meals + ingredients of a delivery (keep the delivery). */
  private clearMeals = async (deliveryDayId: string, transaction: Transaction): Promise<void> => {
    const meals = await db.DeliveryMeal.findAll({
      where: { deliveryDayId }, attributes: ['id'], transaction,
    });
    const mealIds = meals.map((m) => m.id);
    if (mealIds.length) {
      await db.DeliveryMealIngredient.destroy({
        where: { deliveryMealId: { [Op.in]: mealIds } }, transaction,
      });
      await db.DeliveryMeal.destroy({ where: { deliveryDayId }, transaction });
    }
  };
}

export default new MenuResolutionService();

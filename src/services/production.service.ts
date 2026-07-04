import { QueryTypes, Includeable } from 'sequelize';
import { addDays, parseISO, format } from 'date-fns';
import { db } from '@config/sequelize';
import type { DeliveryDayInstance } from '@models/delivery-day.model';
import type { PatientInstance } from '@models/patient.model';
import type { MealSlot } from '@models/delivery-meal.model';
import { shoppingListSql, costPerDishSql, marginPerPackageSql } from '@queries/production.queries';
import type {
  ProductionMapDto,
  ProductionColumnDto,
  ProductionRowDto,
  ProductionCellDto,
  ProductionMealGroupDto,
  KitchenTotalDto,
  DeliveryLabelsDto,
  DeliveryLabelDto,
  KitchenViewDto,
  KitchenSlotDto,
  ShoppingListDto,
  ShoppingListItemDto,
  ShoppingListGroupDto,
  CostPerDishDto,
  MarginPerPackageDto,
} from '@interfaces/production.dto';

const SLOT_ORDER: Record<MealSlot, number> = {
  desayuno: 0, colacion1: 1, comida: 2, colacion2: 3, cena: 4,
};

interface ShoppingRow {
  ingredientId: string; name: string; foodGroup: string;
  baseUnit: string; baseQuantity: string; lastPrice: string | null; portions: string;
}
interface CostPerDishRow {
  dishId: string; dishName: string | null; portions: string; totalCost: string;
}
interface MarginRow {
  packageId: string; code: string; displayLabel: string;
  pricePerDay: string; deliveries: string; totalCost: string;
}

class ProductionService {
  /** Deliveries for a date with patient + resolved meals/ingredients (served + original). */
  private loadDeliveries = (date: string): Promise<DeliveryDayInstance[]> => {
    const ingredientAttrs = ['id', 'name', 'foodGroup', 'baseUnit', 'baseQuantity', 'lastPrice'];
    const includes: Includeable[] = [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'zone', 'tuppers', 'otherFood'],
        include: [{ model: db.CalorieLevel, as: 'calorieLevel', attributes: ['id', 'kcal', 'label'] }],
      },
      {
        model: db.DeliveryMeal,
        as: 'meals',
        include: [
          { model: db.Dish, as: 'dish', attributes: ['id', 'name'] },
          {
            model: db.DeliveryMealIngredient,
            as: 'ingredients',
            include: [
              { model: db.Ingredient, as: 'ingredient', attributes: ingredientAttrs },
              { model: db.Ingredient, as: 'substitutedFrom', attributes: ingredientAttrs },
            ],
          },
        ],
      },
    ];
    return db.DeliveryDay.findAll({
      where: { deliveryDate: date, type: 'package' },
      include: includes,
      order: [['createdAt', 'ASC']],
    });
  };

  private sortedMeals = (dd: DeliveryDayInstance) =>
    (dd.meals ?? []).slice().sort((a, b) => (SLOT_ORDER[a.mealSlot] ?? 9) - (SLOT_ORDER[b.mealSlot] ?? 9));

  private patientOf = (dd: DeliveryDayInstance): PatientInstance | undefined =>
    dd.get('patient') as PatientInstance | undefined;

  /** GET /production-map — the dense nb-map grid. */
  productionMap = async (date: string): Promise<ProductionMapDto> => {
    const deliveries = await this.loadDeliveries(date);

    const columnMap = new Map<string, ProductionColumnDto & { sort: [number, string, number] }>();
    const totals = new Map<string, KitchenTotalDto>();
    const rows: ProductionRowDto[] = [];

    for (const dd of deliveries) {
      const patient = this.patientOf(dd);
      const cells: Record<string, ProductionCellDto> = {};
      for (const meal of this.sortedMeals(dd)) {
        (meal.ingredients ?? []).forEach((mi) => {
          const original = mi.substitutedFrom ?? mi.ingredient;
          const served = mi.ingredient;
          if (!original) return;
          const key = `${meal.mealSlot}::${meal.dishId ?? 'none'}::${original.id}`;
          if (!columnMap.has(key)) {
            columnMap.set(key, {
              key,
              mealSlot: meal.mealSlot,
              dishId: meal.dishId ?? null,
              dishName: meal.dish?.name ?? null,
              ingredientId: original.id,
              ingredientName: original.name,
              foodGroup: original.foodGroup,
              baseQuantity: +original.baseQuantity,
              unit: original.baseUnit,
              sort: [SLOT_ORDER[meal.mealSlot] ?? 9, meal.dish?.name ?? '', mi.position],
            });
          }
          const substituted = mi.substitutedFromIngredientId != null;
          cells[key] = {
            portions: +mi.portions,
            eliminated: mi.eliminated,
            substituted,
            substituteId: substituted ? served?.id ?? null : null,
            substituteName: substituted ? served?.name ?? null : null,
          };

          // Kitchen totals count the ACTUAL served ingredient (skip eliminations).
          if (!mi.eliminated && served) {
            const t = totals.get(served.id);
            if (t) t.portions += +mi.portions;
            else {
              totals.set(served.id, {
                ingredientId: served.id,
                name: served.name,
                foodGroup: served.foodGroup,
                baseUnit: served.baseUnit,
                baseQuantity: +served.baseQuantity,
                portions: +mi.portions,
              });
            }
          }
        });
      }
      rows.push({
        deliveryDayId: dd.id,
        patient: patient
          ? { id: patient.id, firstName: patient.firstName, lastName: patient.lastName }
          : { id: dd.patientId, firstName: '', lastName: '' },
        kcal: patient?.calorieLevel?.kcal ?? null,
        calorieLabel: patient?.calorieLevel?.label ?? null,
        authorized: dd.authorized,
        cells,
      });
    }

    const columns = Array.from(columnMap.values())
      .sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1].localeCompare(b.sort[1]) || a.sort[2] - b.sort[2])
      .map(({ sort: _sort, ...rest }) => rest);

    return {
      date,
      columns,
      mealGroups: this.buildMealGroups(columns),
      rows,
      totalsForKitchen: Array.from(totals.values())
        .map((t) => ({ ...t, portions: Math.round(t.portions * 100) / 100 }))
        .sort((a, b) => a.foodGroup.localeCompare(b.foodGroup) || a.name.localeCompare(b.name)),
      patientCount: deliveries.length,
    };
  };

  private buildMealGroups = (columns: ProductionColumnDto[]): ProductionMealGroupDto[] => {
    const groups: ProductionMealGroupDto[] = [];
    for (const col of columns) {
      let group = groups.find((g) => g.mealSlot === col.mealSlot);
      if (!group) {
        group = { mealSlot: col.mealSlot, dishes: [] };
        groups.push(group);
      }
      let dish = group.dishes.find((d) => d.dishId === col.dishId);
      if (!dish) {
        dish = { dishId: col.dishId, dishName: col.dishName, columns: [] };
        group.dishes.push(dish);
      }
      dish.columns.push(col);
    }
    return groups;
  };

  /** GET /delivery-labels — per-patient delivery labels. */
  deliveryLabels = async (date: string): Promise<DeliveryLabelsDto> => {
    const deliveries = await this.loadDeliveries(date);
    const rows: DeliveryLabelDto[] = deliveries.map((dd) => {
      const patient = this.patientOf(dd);
      const substitutions: DeliveryLabelDto['substitutions'] = [];
      const meals = this.sortedMeals(dd).map((meal) => ({
        mealSlot: meal.mealSlot,
        dishName: meal.dish?.name ?? null,
        ingredients: (meal.ingredients ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((mi) => {
            const substituted = mi.substitutedFromIngredientId != null;
            if (substituted && mi.substitutedFrom && mi.ingredient) {
              substitutions.push({
                mealSlot: meal.mealSlot,
                from: mi.substitutedFrom.name,
                to: mi.ingredient.name,
              });
            }
            return {
              name: mi.ingredient?.name ?? '',
              portions: +mi.portions,
              substituted,
              substitutedFromName: substituted ? mi.substitutedFrom?.name ?? null : null,
              eliminated: mi.eliminated,
            };
          }),
      }));
      return {
        deliveryDayId: dd.id,
        patient: patient
          ? { id: patient.id, firstName: patient.firstName, lastName: patient.lastName }
          : { id: dd.patientId, firstName: '', lastName: '' },
        zone: patient?.zone ?? null,
        tuppers: patient?.tuppers ?? false,
        calorieLabel: patient?.calorieLevel?.label ?? null,
        meals,
        substitutions,
        freeBeverages: patient?.otherFood ?? null,
      };
    });
    return { date, rows, count: rows.length };
  };

  /** GET /kitchen-view — per meal slot: dishes, ingredient totals, exceptions. */
  kitchenView = async (date: string): Promise<KitchenViewDto> => {
    const deliveries = await this.loadDeliveries(date);
    const slotMap = new Map<MealSlot, KitchenSlotDto>();

    const getSlot = (slot: MealSlot): KitchenSlotDto => {
      let s = slotMap.get(slot);
      if (!s) {
        s = { mealSlot: slot, dishes: [], exceptions: [] };
        slotMap.set(slot, s);
      }
      return s;
    };

    for (const dd of deliveries) {
      const patient = this.patientOf(dd);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : '';
      for (const meal of this.sortedMeals(dd)) {
        const slot = getSlot(meal.mealSlot);
        let dish = slot.dishes.find((d) => d.dishId === (meal.dishId ?? null));
        if (!dish) {
          dish = {
            dishId: meal.dishId ?? null, dishName: meal.dish?.name ?? null, patientCount: 0, ingredients: [],
          };
          slot.dishes.push(dish);
        }
        dish.patientCount += 1;

        (meal.ingredients ?? []).forEach((mi) => {
          const served = mi.ingredient;
          if (mi.eliminated) {
            slot.exceptions.push({
              patientName,
              type: 'elimination',
              ingredientName: mi.substitutedFrom?.name ?? served?.name ?? '',
              substituteName: null,
              dishName: meal.dish?.name ?? null,
            });
            return;
          }
          if (mi.substitutedFromIngredientId != null) {
            slot.exceptions.push({
              patientName,
              type: 'substitution',
              ingredientName: mi.substitutedFrom?.name ?? '',
              substituteName: served?.name ?? null,
              dishName: meal.dish?.name ?? null,
            });
          }
          if (!served) return;
          const line = dish.ingredients.find((x) => x.ingredientId === served.id);
          if (line) line.totalPortions += +mi.portions;
          else {
            dish.ingredients.push({
              ingredientId: served.id,
              name: served.name,
              baseQuantity: +served.baseQuantity,
              unit: served.baseUnit,
              totalPortions: +mi.portions,
            });
          }
        });
      }
    }

    const slots = Array.from(slotMap.values())
      .sort((a, b) => (SLOT_ORDER[a.mealSlot] ?? 9) - (SLOT_ORDER[b.mealSlot] ?? 9));
    for (const s of slots) {
      for (const d of s.dishes) {
        for (const line of d.ingredients) {
          line.totalPortions = Math.round(line.totalPortions * 100) / 100;
        }
      }
    }
    return { date, slots };
  };

  /** Convert Σ(portions × baseQuantity) to a display quantity + unit. */
  private toQuantity = (
    portions: number, baseQuantity: number, unit: string,
  ): { quantity: number; quantityUnit: 'kg' | 'l' | 'pzas' } => {
    const base = portions * baseQuantity;
    if (unit === 'pzas') return { quantity: Math.round(base * 100) / 100, quantityUnit: 'pzas' };
    const q = Math.round((base / 1000) * 1000) / 1000;
    return { quantity: q, quantityUnit: unit === 'ml' ? 'l' : 'kg' };
  };

  /** GET /shopping-list?date=|week=|startDate=&endDate= */
  shoppingList = async (start: string, end: string): Promise<ShoppingListDto> => {
    const [ingRows, dishRows, marginRows] = await Promise.all([
      db.sequelize.query<ShoppingRow>(shoppingListSql, {
        replacements: { start, end }, type: QueryTypes.SELECT,
      }),
      db.sequelize.query<CostPerDishRow>(costPerDishSql, {
        replacements: { start, end }, type: QueryTypes.SELECT,
      }),
      db.sequelize.query<MarginRow>(marginPerPackageSql, {
        replacements: { start, end }, type: QueryTypes.SELECT,
      }),
    ]);

    const groupsMap = new Map<string, ShoppingListGroupDto>();
    let estimated = 0;
    for (const r of ingRows) {
      const portions = Number(r.portions);
      const baseQuantity = Number(r.baseQuantity);
      const lastPrice = r.lastPrice == null ? null : Number(r.lastPrice);
      const { quantity, quantityUnit } = this.toQuantity(portions, baseQuantity, r.baseUnit);
      const cost = Math.round(quantity * (lastPrice ?? 0) * 100) / 100;
      estimated += cost;

      const item: ShoppingListItemDto = {
        ingredientId: r.ingredientId,
        name: r.name,
        foodGroup: r.foodGroup,
        portions: Math.round(portions * 100) / 100,
        baseQuantity,
        unit: r.baseUnit,
        quantity,
        quantityUnit,
        lastPrice,
        cost,
      };
      let group = groupsMap.get(r.foodGroup);
      if (!group) {
        group = { foodGroup: r.foodGroup, items: [], subtotal: 0 };
        groupsMap.set(r.foodGroup, group);
      }
      group.items.push(item);
      group.subtotal = Math.round((group.subtotal + cost) * 100) / 100;
    }

    const costPerDish: CostPerDishDto[] = dishRows.map((d) => {
      const portions = Number(d.portions);
      const totalCost = Math.round(Number(d.totalCost) * 100) / 100;
      return {
        dishId: d.dishId,
        dishName: d.dishName,
        portions: Math.round(portions * 100) / 100,
        totalCost,
        costPerPortion: portions > 0 ? Math.round((totalCost / portions) * 100) / 100 : 0,
      };
    });

    const marginPerPackage: MarginPerPackageDto[] = marginRows.map((m) => {
      const deliveries = Number(m.deliveries);
      const pricePerDay = Number(m.pricePerDay);
      const totalCost = Number(m.totalCost);
      const costPerDay = deliveries > 0 ? Math.round((totalCost / deliveries) * 100) / 100 : 0;
      const margin = Math.round((pricePerDay - costPerDay) * 100) / 100;
      const marginPercent = pricePerDay > 0 ? Math.round((margin / pricePerDay) * 10000) / 100 : 0;
      return {
        packageId: m.packageId,
        code: m.code,
        displayLabel: m.displayLabel,
        pricePerDay,
        deliveries,
        costPerDay,
        margin,
        marginPercent,
        alert: marginPercent < 50,
      };
    });

    return {
      startDate: start,
      endDate: end,
      groups: Array.from(groupsMap.values()),
      estimated: Math.round(estimated * 100) / 100,
      costPerDish,
      marginPerPackage,
    };
  };

  /** Resolve the shopping-list date window from date | week | startDate/endDate. */
  resolveRange = (params: {
    date?: string; week?: string; startDate?: string; endDate?: string;
  }): { start: string; end: string } => {
    if (params.startDate && params.endDate) return { start: params.startDate, end: params.endDate };
    if (params.week) {
      return { start: params.week, end: format(addDays(parseISO(params.week), 6), 'yyyy-MM-dd') };
    }
    const d = params.date ?? format(new Date(), 'yyyy-MM-dd');
    return { start: d, end: d };
  };
}

export default new ProductionService();

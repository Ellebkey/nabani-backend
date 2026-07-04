import { Op, QueryTypes } from 'sequelize';
import {
  parseISO, addDays, format, startOfWeek, differenceInCalendarDays,
} from 'date-fns';
import { db } from '@config/sequelize';
import {
  deliveryConflictsSql, adeudosCountSql, lastDeliveryPerPatientSql, weekDeliveriesSql,
} from '@queries/dashboard.queries';
import type {
  DashboardTodayDto,
  DashboardAttentionDto,
  DashboardWeekDto,
  DashboardWeekDayDto,
  WeekDayStatus,
  AgingBucket,
} from '@interfaces/dashboard.dto';

interface ConflictRow {
  deliveryDayId: string; hasMenu: boolean; authorized: boolean;
  patientName: string; preferenceConflicts: string; diseaseConflicts: string;
}
interface LastDeliveryRow { patientId: string; patientName: string; lastDeliveryDate: string }
interface WeekRow { date: string; deliveries: string; conflictCount: string }

class DashboardService {
  private today = (): string => format(new Date(), 'yyyy-MM-dd');

  /** GET /dashboard/today — pipeline status + headline metrics. */
  dashboardToday = async (date: string): Promise<DashboardTodayDto> => {
    const [conflicts, adeudoRows, incomeToday, activePatients, menuDay] = await Promise.all([
      db.sequelize.query<ConflictRow>(deliveryConflictsSql, {
        replacements: { date }, type: QueryTypes.SELECT,
      }),
      db.sequelize.query<{ count: string }>(adeudosCountSql, {
        replacements: { date }, type: QueryTypes.SELECT,
      }),
      db.DeliveryDay.sum('amount', { where: { deliveryDate: date } }),
      db.Patient.count({ where: { status: 'activo' } }),
      db.MenuDay.findOne({
        where: { menuDate: date }, include: [{ model: db.MenuDayMeal, as: 'meals' }],
      }),
    ]);

    const deliveriesToday = conflicts.length;
    const menued = conflicts.filter((c) => c.hasMenu);
    const conflictos = menued.filter((c) => Number(c.preferenceConflicts) > 0).length;
    const listos = menued.length - conflictos;
    const autorizados = conflicts.filter((c) => c.authorized).length;
    const adeudos = Number(adeudoRows[0]?.count ?? 0);
    const mealsAssigned = (menuDay?.meals ?? []).filter((m) => m.dishId != null).length;

    return {
      date,
      pipeline: {
        menuDelDia: {
          done: !!menuDay && mealsAssigned > 0,
          status: menuDay?.status ?? null,
          mealsAssigned,
        },
        ajustes: { listos, conflictos, total: menued.length },
        autorizacion: {
          autorizados, pendientes: deliveriesToday - autorizados, adeudos,
        },
        produccion: {
          ready: deliveriesToday > 0 && autorizados === deliveriesToday,
          authorized: autorizados,
          total: deliveriesToday,
        },
      },
      metrics: {
        incomeToday: Math.round((incomeToday ?? 0) * 100) / 100,
        activePatients,
        deliveriesToday,
      },
    };
  };

  /** GET /dashboard/attention — the "Requiere atención" feed. */
  dashboardAttention = async (date: string): Promise<DashboardAttentionDto> => {
    const conflictsRows = await db.sequelize.query<ConflictRow>(deliveryConflictsSql, {
      replacements: { date }, type: QueryTypes.SELECT,
    });
    const conflicts = conflictsRows
      .filter((c) => Number(c.preferenceConflicts) > 0 || Number(c.diseaseConflicts) > 0)
      .map((c) => ({
        deliveryDayId: c.deliveryDayId,
        patientName: c.patientName,
        preferenceConflicts: Number(c.preferenceConflicts),
        diseaseConflicts: Number(c.diseaseConflicts),
      }));

    const overdue = await db.Payment.findAll({
      where: { paid: false, dueDate: { [Op.lte]: date } },
      include: [{ model: db.Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['dueDate', 'ASC']],
      limit: 100,
    });
    const overduePayments = overdue.map((p) => {
      const agingDays = differenceInCalendarDays(parseISO(date), parseISO(p.dueDate));
      let bucket: AgingBucket = 'due';
      if (agingDays > 0) bucket = 'overdue';
      else if (agingDays < 0) bucket = 'upcoming';
      const patient = p.get('patient') as { firstName: string; lastName: string } | undefined;
      return {
        paymentId: p.id,
        patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : '',
        dueDate: p.dueDate,
        amount: +p.amount,
        agingDays,
        bucket,
      };
    });

    const from = format(addDays(parseISO(date), -4), 'yyyy-MM-dd');
    const to = format(addDays(parseISO(date), 4), 'yyyy-MM-dd');
    const lastRows = await db.sequelize.query<LastDeliveryRow>(lastDeliveryPerPatientSql, {
      replacements: { from, to }, type: QueryTypes.SELECT,
    });
    const expiringPackages = lastRows.map((r) => ({
      patientId: r.patientId,
      patientName: r.patientName,
      lastDeliveryDate: r.lastDeliveryDate,
      daysUntil: differenceInCalendarDays(parseISO(r.lastDeliveryDate), parseISO(date)),
    }));

    const noMenu = await db.DeliveryDay.findAll({
      where: { deliveryDate: date, type: 'package', hasMenu: false },
      include: [{
        model: db.Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'status'],
      }],
      limit: 100,
    });
    const missingMenu = noMenu
      .map((dd) => {
        const patient = dd.get('patient') as
          { firstName: string; lastName: string; status: string } | undefined;
        return { deliveryDayId: dd.id, patient };
      })
      .filter((x) => x.patient?.status === 'activo')
      .map((x) => ({
        deliveryDayId: x.deliveryDayId,
        patientName: x.patient ? `${x.patient.firstName} ${x.patient.lastName}`.trim() : '',
      }));

    return {
      date, conflicts, overduePayments, expiringPackages, missingMenu,
    };
  };

  /** GET /dashboard/week — the 7-day status strip (Mon–Sun of the week). */
  dashboardWeek = async (date: string): Promise<DashboardWeekDto> => {
    const start = startOfWeek(parseISO(date), { weekStartsOn: 1 });
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(addDays(start, 6), 'yyyy-MM-dd');

    const [rows, menuDays] = await Promise.all([
      db.sequelize.query<WeekRow>(weekDeliveriesSql, {
        replacements: { start: startStr, end: endStr }, type: QueryTypes.SELECT,
      }),
      db.MenuDay.findAll({ where: { menuDate: { [Op.between]: [startStr, endStr] } } }),
    ]);

    const deliveriesByDate = new Map(rows.map((r) => [r.date, r]));
    const menuByDate = new Map(menuDays.map((m) => [m.menuDate, m.status]));

    const days: DashboardWeekDayDto[] = Array.from({ length: 7 }, (_, i) => {
      const d = format(addDays(start, i), 'yyyy-MM-dd');
      const row = deliveriesByDate.get(d);
      const deliveries = Number(row?.deliveries ?? 0);
      const conflictCount = Number(row?.conflictCount ?? 0);
      const menuStatus = menuByDate.get(d) ?? null;
      let status: WeekDayStatus;
      if (!menuStatus) status = 'borrador';
      else if (conflictCount > 0) status = 'ajustes';
      else status = menuStatus === 'completo' ? 'completo' : 'borrador';
      return {
        date: d, deliveries, menuStatus, conflictCount, status,
      };
    });

    return { startDate: startStr, endDate: endStr, days };
  };

  /** Default the ?date= param to today (business date). */
  resolveDate = (date?: string): string => date ?? this.today();
}

export default new DashboardService();

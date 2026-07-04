/* ------------------------------------------------------------------ *
 *  GET /dashboard/today                                             *
 * ------------------------------------------------------------------ */
export interface DashboardTodayDto {
  date: string;
  pipeline: {
    menuDelDia: { done: boolean; status: string | null; mealsAssigned: number };
    ajustes: { listos: number; conflictos: number; total: number };
    autorizacion: { autorizados: number; pendientes: number; adeudos: number };
    produccion: { ready: boolean; authorized: number; total: number };
  };
  metrics: {
    incomeToday: number;
    activePatients: number;
    deliveriesToday: number;
  };
}

/* ------------------------------------------------------------------ *
 *  GET /dashboard/attention                                          *
 * ------------------------------------------------------------------ */
export type AgingBucket = 'overdue' | 'due' | 'upcoming';

export interface DashboardAttentionDto {
  date: string;
  conflicts: {
    deliveryDayId: string;
    patientName: string;
    preferenceConflicts: number;
    diseaseConflicts: number;
  }[];
  overduePayments: {
    paymentId: string;
    patientName: string;
    dueDate: string;
    amount: number;
    agingDays: number;
    bucket: AgingBucket;
  }[];
  expiringPackages: {
    patientId: string;
    patientName: string;
    lastDeliveryDate: string;
    daysUntil: number;
  }[];
  missingMenu: {
    deliveryDayId: string;
    patientName: string;
  }[];
}

/* ------------------------------------------------------------------ *
 *  GET /dashboard/week                                              *
 * ------------------------------------------------------------------ */
export type WeekDayStatus = 'completo' | 'ajustes' | 'borrador';

export interface DashboardWeekDayDto {
  date: string;
  deliveries: number;
  menuStatus: string | null;
  conflictCount: number;
  status: WeekDayStatus;
}

export interface DashboardWeekDto {
  startDate: string;
  endDate: string;
  days: DashboardWeekDayDto[];
}

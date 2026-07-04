/** Per-delivery unresolved conflict counts for a single date (Hoy pipeline + feed). */
export const deliveryConflictsSql = `
  SELECT dd.id        AS "deliveryDayId",
         dd.has_menu   AS "hasMenu",
         dd.authorized AS "authorized",
         p.first_name || ' ' || p.last_name AS "patientName",
         COUNT(dmi.id) FILTER (
           WHERE dmi.conflict_type = 'preference' AND dmi.eliminated = false
         ) AS "preferenceConflicts",
         COUNT(dmi.id) FILTER (
           WHERE dmi.conflict_type = 'disease' AND dmi.eliminated = false
         ) AS "diseaseConflicts"
  FROM delivery_day dd
  JOIN patient p ON p.id = dd.patient_id
  LEFT JOIN delivery_meal dm ON dm.delivery_day_id = dd.id
  LEFT JOIN delivery_meal_ingredient dmi ON dmi.delivery_meal_id = dm.id
  WHERE dd.delivery_date = :date
    AND dd.type = 'package'
  GROUP BY dd.id, p.id
  ORDER BY p.first_name, p.last_name;
`;

/** Count of package deliveries on :date whose installment payment is still unpaid. */
export const adeudosCountSql = `
  SELECT COUNT(*) AS "count"
  FROM delivery_day dd
  JOIN payment pay ON pay.id = dd.payment_id
  WHERE dd.delivery_date = :date
    AND dd.type = 'package'
    AND pay.paid = false;
`;

/** Last delivery date per patient, for renewal prompts (expiring packages). */
export const lastDeliveryPerPatientSql = `
  SELECT dd.patient_id AS "patientId",
         p.first_name || ' ' || p.last_name AS "patientName",
         MAX(dd.delivery_date) AS "lastDeliveryDate"
  FROM delivery_day dd
  JOIN patient p ON p.id = dd.patient_id
  WHERE dd.type = 'package'
  GROUP BY dd.patient_id, p.first_name, p.last_name
  HAVING MAX(dd.delivery_date) BETWEEN :from AND :to;
`;

/** Package deliveries + menu status per day over a week range. */
export const weekDeliveriesSql = `
  SELECT dd.delivery_date AS "date",
         COUNT(DISTINCT dd.id) AS "deliveries",
         COUNT(dmi.id) FILTER (
           WHERE dmi.conflict_type IS NOT NULL AND dmi.eliminated = false
         ) AS "conflictCount"
  FROM delivery_day dd
  LEFT JOIN delivery_meal dm ON dm.delivery_day_id = dd.id
  LEFT JOIN delivery_meal_ingredient dmi ON dmi.delivery_meal_id = dm.id
  WHERE dd.delivery_date BETWEEN :start AND :end
    AND dd.type = 'package'
  GROUP BY dd.delivery_date;
`;

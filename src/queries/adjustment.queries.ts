/**
 * The ajustes queue: one row per package delivery on :date with its patient,
 * calorie level, package and unresolved preference/disease conflict counts.
 * A swap clears conflict_type, an elimination sets eliminated → both drop out
 * of these counts automatically.
 */
export const adjustmentsQueueSql = `
  SELECT dd.id          AS "deliveryDayId",
         dd.has_menu     AS "hasMenu",
         dd.authorized   AS "authorized",
         p.id            AS "patientId",
         p.first_name    AS "firstName",
         p.last_name     AS "lastName",
         cl.id           AS "calorieLevelId",
         cl.kcal         AS "kcal",
         cl.label        AS "calorieLabel",
         pk.id           AS "packageId",
         pk.code         AS "packageCode",
         pk.display_label AS "packageLabel",
         pk.price_per_day AS "pricePerDay",
         COUNT(dmi.id) FILTER (
           WHERE dmi.conflict_type = 'preference' AND dmi.eliminated = false
         ) AS "preferenceConflicts",
         COUNT(dmi.id) FILTER (
           WHERE dmi.conflict_type = 'disease' AND dmi.eliminated = false
         ) AS "diseaseConflicts"
  FROM delivery_day dd
  JOIN patient p ON p.id = dd.patient_id
  LEFT JOIN calorie_level cl ON cl.id = p.calorie_level_id
  LEFT JOIN package pk ON pk.id = dd.package_id
  LEFT JOIN delivery_meal dm ON dm.delivery_day_id = dd.id
  LEFT JOIN delivery_meal_ingredient dmi ON dmi.delivery_meal_id = dm.id
  WHERE dd.delivery_date = :date
    AND dd.type = 'package'
  GROUP BY dd.id, p.id, cl.id, pk.id
  ORDER BY p.first_name, p.last_name;
`;

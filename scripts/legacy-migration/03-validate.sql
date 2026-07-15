-- ============================================================================
-- Post-ETL validation: run after 02-etl.sql. Everything should come back
-- clean (zeros) except the money-drift report, which mirrors drift that
-- already existed in the legacy system.
-- ============================================================================
\pset pager off

\echo '== A. orphaned foreign keys (all should be 0) =='
SELECT
  (SELECT count(*) FROM patient p LEFT JOIN calorie_level c ON c.id = p.calorie_level_id
    WHERE p.calorie_level_id IS NOT NULL AND c.id IS NULL)          AS patient_bad_kcal,
  (SELECT count(*) FROM sale s LEFT JOIN patient p ON p.id = s.patient_id
    WHERE s.patient_id IS NOT NULL AND p.id IS NULL)                AS sale_bad_patient,
  (SELECT count(*) FROM payment y LEFT JOIN sale s ON s.id = y.sale_id
    WHERE y.sale_id IS NOT NULL AND s.id IS NULL)                   AS payment_bad_sale,
  (SELECT count(*) FROM delivery_day d LEFT JOIN sale s ON s.id = d.sale_id
    WHERE d.sale_id IS NOT NULL AND s.id IS NULL)                   AS delivery_bad_sale,
  (SELECT count(*) FROM delivery_meal m LEFT JOIN delivery_day d ON d.id = m.delivery_day_id
    WHERE d.id IS NULL)                                             AS meal_bad_delivery,
  (SELECT count(*) FROM delivery_meal_ingredient i LEFT JOIN ingredient g ON g.id = i.ingredient_id
    WHERE g.id IS NULL)                                             AS dmi_bad_ingredient,
  (SELECT count(*) FROM dish_ingredient di LEFT JOIN dish d ON d.id = di.dish_id
    WHERE d.id IS NULL)                                             AS dishing_bad_dish;

\echo '== B. NOT NULL / enum sanity =='
SELECT
  (SELECT count(*) FROM sale WHERE billing NOT IN ('mensual','quincenal','semanal','diario')) AS bad_billing,
  (SELECT count(*) FROM sale WHERE type NOT IN ('package','consulta'))                        AS bad_sale_type,
  (SELECT count(*) FROM sale WHERE status NOT IN ('pendiente','pagada'))                      AS bad_sale_status,
  (SELECT count(*) FROM delivery_day WHERE type NOT IN ('package','consulta'))                AS bad_delivery_type,
  (SELECT count(*) FROM patient WHERE status NOT IN ('activo','inactivo'))                    AS bad_patient_status,
  (SELECT count(*) FROM patient WHERE week IS NOT NULL AND week NOT IN ('LD','LV','LS'))      AS bad_week,
  (SELECT count(*) FROM ingredient WHERE food_group NOT IN
     ('verdura','fruta','cereal','lacteo','condimento','otros'))                              AS bad_food_group,
  (SELECT count(*) FROM expense WHERE type NOT IN ('fijo','variable','nomina'))               AS bad_expense_type,
  (SELECT count(*) FROM consultation WHERE type NOT IN ('inicial','seguimiento'))             AS bad_consult_type,
  (SELECT count(*) FROM employee WHERE position NOT IN
     ('nutriologa','admin','cocina','front_desk','reparto'))                                  AS bad_position;

\echo '== C. legacy vs migrated counts =='
SELECT 'users' AS entity,
  (SELECT count(*) FROM legacy."user") AS legacy, (SELECT count(*) FROM public."user") AS migrated
UNION ALL SELECT 'patients (all roles=patient)',
  (SELECT count(*) FROM legacy.person WHERE role='patient'), (SELECT count(*) FROM patient)
UNION ALL SELECT 'employees (role<>patient)',
  (SELECT count(*) FROM legacy.person WHERE role<>'patient'), (SELECT count(*) FROM employee)
UNION ALL SELECT 'addresses (patients)',
  (SELECT count(*) FROM legacy.address a JOIN legacy.person p ON p.id=a.person_id AND p.role='patient'),
  (SELECT count(*) FROM patient_address)
UNION ALL SELECT 'consultations',
  (SELECT count(*) FROM legacy.person_tracking t JOIN legacy.person p ON p.id=t.person_id AND p.role='patient'),
  (SELECT count(*) FROM consultation)
UNION ALL SELECT 'packages',
  (SELECT count(*) FROM legacy.product), (SELECT count(*) FROM package)
UNION ALL SELECT 'preferences (patient, deduped)',
  (SELECT count(DISTINCT (person_id, ingredient_id)) FROM legacy.ingredient_preference ip
     JOIN legacy.person p ON p.id=ip.person_id AND p.role='patient'
     JOIN legacy.ingredient g ON g.id=ip.ingredient_id),
  (SELECT count(*) FROM patient_preference);

\echo '== D. window scope recap =='
SELECT
  (SELECT count(*) FROM sale)                                    AS sales_migrated,
  (SELECT count(*) FROM payment)                                 AS payments_migrated,
  (SELECT count(*) FROM delivery_day)                            AS deliveries_migrated,
  (SELECT min(delivery_date) FROM delivery_day)                  AS first_delivery,
  (SELECT max(delivery_date) FROM delivery_day)                  AS last_delivery,
  (SELECT count(*) FROM delivery_day WHERE delivery_date >= current_date) AS future_deliveries,
  (SELECT count(*) FROM menu_day)                                AS menu_days;

\echo '== E. money-flow integrity: sale totals vs payments vs delivery days =='
WITH agg AS (
  SELECT s.id, s.folio, s.total_amount,
    coalesce((SELECT sum(y.amount) FROM payment y WHERE y.sale_id = s.id),0) AS pay_sum,
    coalesce((SELECT sum(d.amount) FROM delivery_day d WHERE d.sale_id = s.id),0) AS daily_sum
  FROM sale s
)
SELECT
  count(*)                                                            AS sales,
  count(*) FILTER (WHERE abs(total_amount - pay_sum) > 1)             AS pay_mismatch,
  count(*) FILTER (WHERE abs(total_amount - daily_sum) > 1)           AS daily_mismatch,
  round(avg(abs(total_amount - pay_sum)), 2)                          AS avg_pay_drift,
  round(avg(abs(total_amount - daily_sum)), 2)                        AS avg_daily_drift
FROM agg;

\echo '== E2. same drift measured in LEGACY for the same sales (baseline) =='
WITH agg AS (
  SELECT s.id, s.total_amount,
    coalesce((SELECT sum(y.amount) FROM legacy.payment y
              WHERE y.sale_id = s.id AND y.record_status IS NOT FALSE),0) AS pay_sum,
    coalesce((SELECT sum(d.amount) FROM legacy.daily_income d
              WHERE d.sale_id = s.id),0) AS daily_sum
  FROM legacy.sale s
  WHERE EXISTS (SELECT 1 FROM sale ns WHERE ns.folio = 'L-'||s.id)
)
SELECT
  count(*)                                                            AS sales,
  count(*) FILTER (WHERE abs(total_amount - pay_sum) > 1)             AS pay_mismatch,
  count(*) FILTER (WHERE abs(total_amount - daily_sum) > 1)           AS daily_mismatch
FROM agg;

\echo '== F. patient status distribution =='
SELECT status, count(*) FROM patient GROUP BY 1;

\echo '== G. active patients with a future delivery but no menu link =='
SELECT count(DISTINCT d.patient_id)
FROM delivery_day d
WHERE d.delivery_date >= current_date AND d.menu_day_id IS NULL;

\echo '== H. spot check: one active patient end-to-end =='
WITH px AS (
  SELECT p.id, p.first_name, p.last_name, p.status, cl.kcal
  FROM patient p
  LEFT JOIN calorie_level cl ON cl.id = p.calorie_level_id
  WHERE p.status = 'activo'
    AND EXISTS (SELECT 1 FROM delivery_day d
                WHERE d.patient_id = p.id AND d.delivery_date >= current_date)
  ORDER BY p.first_name LIMIT 1
)
SELECT px.first_name || ' ' || px.last_name AS patient, px.status, px.kcal,
  (SELECT count(*) FROM sale s WHERE s.patient_id = px.id)              AS sales,
  (SELECT count(*) FROM payment y WHERE y.patient_id = px.id)          AS payments,
  (SELECT count(*) FROM delivery_day d WHERE d.patient_id = px.id)     AS deliveries,
  (SELECT count(*) FROM delivery_day d WHERE d.patient_id = px.id
     AND d.delivery_date >= current_date)                              AS future_deliveries,
  (SELECT count(*) FROM consultation c WHERE c.patient_id = px.id)     AS consultations,
  (SELECT count(*) FROM patient_preference f WHERE f.patient_id = px.id) AS dislikes,
  (SELECT count(*) FROM patient_disease f WHERE f.patient_id = px.id)  AS diseases
FROM px;

\echo '== I. dishes and portions coverage =='
SELECT
  (SELECT count(*) FROM dish)                                          AS dishes,
  (SELECT count(*) FROM dish_ingredient)                               AS dish_ingredients,
  (SELECT count(*) FROM dish_ingredient_portion)                       AS portions_rows,
  (SELECT count(DISTINCT dish_id) FROM menu_day_meal WHERE dish_id IS NOT NULL) AS dishes_used_in_menus,
  (SELECT count(*) FROM delivery_meal)                                 AS delivery_meals,
  (SELECT count(*) FROM delivery_meal WHERE dish_id IS NOT NULL)       AS delivery_meals_matched_to_dish,
  (SELECT count(*) FROM delivery_meal_ingredient)                      AS delivery_meal_ingredients,
  (SELECT count(*) FROM delivery_meal_ingredient WHERE conflict_type IS NOT NULL) AS flagged_conflicts;

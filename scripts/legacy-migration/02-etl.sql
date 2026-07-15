-- ============================================================================
-- Nutrivera (legacy) → Nabani ETL
-- ============================================================================
-- Prerequisites (see README.md in this folder):
--   1. Nabani tables exist (boot the API once or run the seed script) and the
--      catalog seed ran (16 diseases + base calorie levels).
--   2. The legacy dump is loaded into schema `legacy` of the SAME database
--      (01-load-legacy-dump.sh).
--
-- Window: transactional data (sales→payments→delivery days, menus, expenses)
-- is limited to current_date ± 3 months. Master data (users, patients and
-- their full clinical profile, ingredients, packages) migrates in full.
-- A sale with ANY activity inside the window brings ALL of its payments and
-- delivery days, so the Sale → Payments → DeliveryDays money graph stays
-- consistent even when it spills a few days past the window edges.
--
-- IDs are deterministic (uuid v5 of "<kind>:<legacy id>"), so the script is
-- idempotent and every new row can be traced back to its legacy row. Sales,
-- payments and expenses also carry folio 'L-<legacy id>'.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS legacy_etl;

CREATE OR REPLACE FUNCTION legacy_etl.nid(kind text, key text) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
  SELECT uuid_generate_v5(
    uuid_generate_v5(uuid_ns_url(), 'nabani-legacy-migration'),
    kind || ':' || key);
$$;

CREATE OR REPLACE FUNCTION legacy_etl.safe_numeric(t text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN t ~ '^-?[0-9]+(\.[0-9]+)?$' THEN t::numeric END;
$$;

CREATE OR REPLACE FUNCTION legacy_etl.safe_int(t text) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN trim(t) ~ '^-?[0-9]{1,9}$' THEN trim(t)::int END;
$$;

CREATE OR REPLACE FUNCTION legacy_etl.norm_unit(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN lower(trim(coalesce(t,''))) IN ('gr','ml','pzas')
              THEN lower(trim(t)) ELSE 'gr' END;
$$;

-- legacy meal type → Nabani meal_slot (menu/delivery position)
CREATE OR REPLACE FUNCTION legacy_etl.meal_slot(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(trim(coalesce(t,'')))
    WHEN 'breakfast' THEN 'desayuno'
    WHEN 'snack1'    THEN 'colacion1'
    WHEN 'lunch'     THEN 'comida'
    WHEN 'snack2'    THEN 'colacion2'
    WHEN 'dinner'    THEN 'cena'
  END;
$$;

-- legacy meal type → Nabani dish.meal_time (library category)
CREATE OR REPLACE FUNCTION legacy_etl.meal_time(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(trim(coalesce(t,'')))
    WHEN 'breakfast' THEN 'desayuno'
    WHEN 'snack1'    THEN 'snack'
    WHEN 'snack2'    THEN 'snack'
    WHEN 'lunch'     THEN 'comida'
    WHEN 'dinner'    THEN 'cena'
  END;
$$;

-- business dates were captured in Mexico City time
CREATE OR REPLACE FUNCTION legacy_etl.mx_date(ts timestamptz) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT (ts AT TIME ZONE 'America/Mexico_City')::date;
$$;

-- migration window
CREATE TEMP TABLE _p AS SELECT
  (current_date - interval '3 months')::date AS win_start,
  (current_date + interval '3 months')::date AS win_end;

-- ---------------------------------------------------------------------------
-- 1. Users (all). Legacy passwords are unusable placeholders; every migrated
--    account gets the temporary password whose bcrypt hash is passed via
--    -v temp_password_hash (see README — never hardcode it here).
--    Roles: admin→admin, nutriologo/doctor→nutriologa, staff→front_desk.
-- ---------------------------------------------------------------------------
\echo '== 1. users =='
INSERT INTO public."user"
  (id, username, fullname, hashed_password, email, mobile_number,
   email_verified, roles, created_at, updated_at)
SELECT
  legacy_etl.nid('user', u.id::text),
  u.username,
  u.display_name,
  :'temp_password_hash',
  u.email,
  NULL,
  true,
  (CASE
     WHEN u.roles ? 'admin' THEN '["admin"]'
     WHEN u.roles ? 'nutriologo' OR u.roles ? 'doctor' THEN '["nutriologa"]'
     ELSE '["front_desk"]'
   END)::json,
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, now())
FROM legacy."user" u
WHERE NOT EXISTS (SELECT 1 FROM public."user" x WHERE x.username = u.username);

-- ---------------------------------------------------------------------------
-- 2. Calorie levels present in legacy data but missing from the seed
--    (patients' person_calorie.name and menu kcal tiers; 800–4000 accepted).
-- ---------------------------------------------------------------------------
\echo '== 2. calorie levels =='
WITH tiers AS (
  SELECT DISTINCT name::int AS kcal
  FROM legacy.person_calorie
  WHERE name ~ '^[0-9]{3,4}$' AND name::int BETWEEN 800 AND 4000
  UNION
  SELECT DISTINCT (cp->>'kcal')::int
  FROM legacy.main_menu, jsonb_array_elements(calories_portions) cp
  WHERE cp->>'kcal' ~ '^[0-9]{3,4}$' AND (cp->>'kcal')::int BETWEEN 800 AND 4000
)
INSERT INTO public.calorie_level
  (id, kcal, label, sort_order, active, created_at, updated_at)
SELECT
  legacy_etl.nid('kcal', t.kcal::text),
  t.kcal, t.kcal::text,
  100 + (row_number() OVER (ORDER BY t.kcal))::int,
  true, now(), now()
FROM tiers t
WHERE NOT EXISTS (SELECT 1 FROM public.calorie_level c WHERE c.kcal = t.kcal);

-- ---------------------------------------------------------------------------
-- 3. Ingredients.
--    food_group: Verdura/Fruta/Cereal/Condimento/Otros map 1:1, Queso→lacteo,
--    the rest (Proteina/Preparado/Embutido/Carne/Semillas/blank)→otros.
--    base_quantity/base_unit: the most frequent size/unit ever used for the
--    ingredient across all master menus (fallback 0/gr).
--    Menu-referenced ingredient ids missing from the catalog are created as
--    inactive placeholder rows so dishes and delivery meals keep integrity.
-- ---------------------------------------------------------------------------
\echo '== 3. ingredients =='
WITH usage AS (
  SELECT (i->>'id')::int AS ing_id,
         mode() WITHIN GROUP (ORDER BY legacy_etl.safe_numeric(i->>'size')) AS m_size,
         mode() WITHIN GROUP (ORDER BY nullif(lower(trim(i->>'unit')),'')) AS m_unit
  FROM legacy.main_menu m,
       jsonb_array_elements(m.meals) meal,
       jsonb_array_elements(meal->'ingredients') i
  WHERE (i->>'id') ~ '^[0-9]+$'
  GROUP BY 1
)
INSERT INTO public.ingredient
  (id, name, food_group, base_unit, base_quantity, last_price, active,
   created_at, updated_at)
SELECT
  legacy_etl.nid('ingredient', g.id::text),
  left(coalesce(nullif(trim(g.name),''), 'Ingrediente '||g.id), 80),
  CASE lower(coalesce(trim(g.group_name),''))
    WHEN 'verdura' THEN 'verdura'
    WHEN 'fruta' THEN 'fruta'
    WHEN 'cereal' THEN 'cereal'
    WHEN 'condimento' THEN 'condimento'
    WHEN 'lacteo' THEN 'lacteo'
    WHEN 'queso' THEN 'lacteo'
    ELSE 'otros'
  END,
  legacy_etl.norm_unit(u.m_unit),
  coalesce(least(u.m_size, 99999), 0),
  NULL, true,
  coalesce(g.created_at, now()), coalesce(g.updated_at, now())
FROM legacy.ingredient g
LEFT JOIN usage u ON u.ing_id = g.id;

\echo '== 3b. placeholder ingredients (referenced by menus, absent in catalog) =='
WITH refs AS (
  SELECT (i->>'id')::int AS ing_id, nullif(trim(i->>'name'),'') AS nm
  FROM legacy.main_menu m,
       jsonb_array_elements(m.meals) meal,
       jsonb_array_elements(meal->'ingredients') i
  WHERE (i->>'id') ~ '^[0-9]+$'
  UNION ALL
  SELECT (i->>'id')::int, nullif(trim(i->>'name'),'')
  FROM legacy.daily_income d,
       _p,
       jsonb_array_elements(d.menu) meal,
       jsonb_array_elements(meal->'ingredients') i
  WHERE d.menu IS NOT NULL AND jsonb_typeof(d.menu) = 'array'
    AND d.income_day BETWEEN _p.win_start AND _p.win_end
    AND (i->>'id') ~ '^[0-9]+$'
), missing AS (
  SELECT ing_id, mode() WITHIN GROUP (ORDER BY nm) AS nm
  FROM refs r
  WHERE NOT EXISTS (SELECT 1 FROM legacy.ingredient g WHERE g.id = r.ing_id)
  GROUP BY 1
)
INSERT INTO public.ingredient
  (id, name, food_group, base_unit, base_quantity, last_price, active,
   created_at, updated_at)
SELECT
  legacy_etl.nid('ingredient', ing_id::text),
  left(coalesce(nm, 'Ingrediente '||ing_id), 80),
  'otros', 'gr', 0, NULL, false, now(), now()
FROM missing
ON CONFLICT (id) DO NOTHING;

\echo '== 3c. ingredient ↔ disease incompatibilities =='
INSERT INTO public.ingredient_disease (id, ingredient_id, disease_id)
SELECT
  legacy_etl.nid('ingdis', g.id::text || '|' || f.key),
  legacy_etl.nid('ingredient', g.id::text),
  d.id
FROM legacy.ingredient g
CROSS JOIN LATERAL (VALUES
  ('hipertension',   g.hipertension),
  ('diabetes',       g.diabetes),
  ('colesterolemia', g.colesterol),
  ('trigliceridos',  g.trigliceridos),
  ('colitis',        g.colitis),
  ('gastritis',      g.gastritis),
  ('embarazo',       g.embarazo)
) f(key, flag)
JOIN public.disease d ON d.key = f.key
WHERE f.flag IS TRUE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Patients (ALL persons with role='patient', active and inactive).
--    record_status → status activo/inactivo. Latest person_calorie row gives
--    the calorie level. person_disease especiales/otros (+ the retired
--    'fibras' flag) land in other_diseases. Legacy patient number and
--    program_know have no Nabani home and are dropped (spec: number deprecated).
--    doctor_id was never populated in legacy → nutriologa_id stays NULL.
-- ---------------------------------------------------------------------------
\echo '== 4. patients =='
INSERT INTO public.patient
  (id, first_name, last_name, email, cellphone, gender, birthday, week, zone,
   tuppers, other_food, other_diseases, other_preferences, status,
   calorie_level_id, nutriologa_id, created_at, updated_at)
SELECT
  legacy_etl.nid('patient', p.id::text),
  left(coalesce(nullif(trim(p.first_name),''),'(Sin nombre)'), 80),
  left(coalesce(nullif(trim(p.last_name),''),''), 80),
  nullif(trim(p.email),''),
  nullif(trim(p.cellphone),''),
  nullif(trim(p.gender),''),
  p.birthday,
  CASE WHEN upper(trim(coalesce(p.week,''))) IN ('LD','LV','LS')
       THEN upper(trim(p.week)) END,
  left(nullif(trim(p.zone),''), 80),
  coalesce(p.tuppers, false),
  nullif(trim(p.other_food),''),
  nullif(concat_ws('; ',
    nullif(trim(d.especiales),''),
    nullif(trim(d.otros),''),
    CASE WHEN d.fibras THEN 'Fibras' END), ''),
  NULL,
  CASE WHEN p.record_status THEN 'activo' ELSE 'inactivo' END,
  cl.id,
  NULL,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
FROM legacy.person p
LEFT JOIN LATERAL (
  SELECT c.name FROM legacy.person_calorie c
  WHERE c.person_id = p.id
  ORDER BY c.updated_at DESC NULLS LAST, c.id DESC
  LIMIT 1
) pc ON true
LEFT JOIN public.calorie_level cl
  ON pc.name ~ '^[0-9]{3,4}$'
 AND pc.name::int BETWEEN 800 AND 4000
 AND cl.kcal = pc.name::int
LEFT JOIN legacy.person_disease d ON d.person_id = p.id
WHERE p.role = 'patient';

\echo '== 4b. patient addresses =='
INSERT INTO public.patient_address
  (id, patient_id, street, number_ext, number_int, neighborhood, zip_code,
   city, state)
SELECT
  legacy_etl.nid('addr', a.id::text),
  legacy_etl.nid('patient', a.person_id::text),
  left(nullif(trim(a.street),''), 120),
  left(nullif(trim(a.number_ext),''), 20),
  left(nullif(trim(a.number_int),''), 20),
  left(nullif(trim(a.neighborhood),''), 120),
  left(nullif(trim(a.zip_code),''), 10),
  left(nullif(trim(a.city),''), 80),
  left(nullif(trim(a.state),''), 80)
FROM legacy.address a
JOIN legacy.person p ON p.id = a.person_id AND p.role = 'patient';

\echo '== 4c. nutrition plans (latest person_calorie per patient) =='
INSERT INTO public.nutrition_plan
  (id, patient_id, calorie_level_id, verduras, frutas, cereales, lacteos,
   p_desayuno, p_comida, p_cena, aceites, semillas, comments)
SELECT DISTINCT ON (c.person_id)
  legacy_etl.nid('nplan', c.person_id::text),
  legacy_etl.nid('patient', c.person_id::text),
  cl.id,
  c.vegetable, c.fruit, c.cereal, c.milk,
  c.breakfast, c.lunch, c.dinner, c.oil, c.seed,
  nullif(trim(c.comments),'')
FROM legacy.person_calorie c
JOIN legacy.person p ON p.id = c.person_id AND p.role = 'patient'
LEFT JOIN public.calorie_level cl
  ON c.name ~ '^[0-9]{3,4}$'
 AND c.name::int BETWEEN 800 AND 4000
 AND cl.kcal = c.name::int
ORDER BY c.person_id, c.updated_at DESC NULLS LAST, c.id DESC;

\echo '== 4d. patient diseases (17 legacy flags → 16-key catalog) =='
INSERT INTO public.patient_disease (id, patient_id, disease_id)
SELECT
  legacy_etl.nid('pdis', pd.person_id::text || '|' || f.key),
  legacy_etl.nid('patient', pd.person_id::text),
  d.id
FROM legacy.person_disease pd
JOIN legacy.person p ON p.id = pd.person_id AND p.role = 'patient'
CROSS JOIN LATERAL (VALUES
  ('diabetes',       pd.diabetes),
  ('arterosclerosis',pd.arterosclerosis),
  ('hipertension',   pd.hipertension),
  ('infartos',       pd.infartos),
  ('tiroides',       pd.tiroides),
  ('embarazo',       pd.embarazo),
  ('lactante',       pd.lactante),
  ('colesterolemia', pd.colesterolemia),
  ('trigliceridos',  pd.trigliceridos),
  ('osteoporosis',   pd.osteoporosis),
  ('digestion',      pd.digestion),
  ('gastritis',      pd.gastritis),
  ('colitis',        pd.colitis),
  ('estrenimiento',  pd.estrenimiento),
  ('hormonas',       pd.hormonas),
  ('hidratacion',    pd.hidratacion)
) f(key, flag)
JOIN public.disease d ON d.key = f.key
WHERE f.flag IS TRUE
ON CONFLICT DO NOTHING;

\echo '== 4e. patient preferences (disliked ingredients) =='
INSERT INTO public.patient_preference (id, patient_id, ingredient_id)
SELECT DISTINCT
  legacy_etl.nid('pref', ip.person_id::text || '|' || ip.ingredient_id::text),
  legacy_etl.nid('patient', ip.person_id::text),
  legacy_etl.nid('ingredient', ip.ingredient_id::text)
FROM legacy.ingredient_preference ip
JOIN legacy.person p ON p.id = ip.person_id AND p.role = 'patient'
JOIN legacy.ingredient g ON g.id = ip.ingredient_id
ON CONFLICT DO NOTHING;

\echo '== 4f. consultations (full person_tracking history) =='
INSERT INTO public.consultation
  (id, patient_id, nutriologa_id, consult_date, price, type, weight, body_fat,
   muscle, water, arm, waist, abdomen, hip, height, age, objetivo_kcal, notes,
   created_at)
SELECT
  legacy_etl.nid('consult', t.id::text),
  legacy_etl.nid('patient', t.person_id::text),
  NULL,
  coalesce(legacy_etl.mx_date(t.created_at), current_date),
  0,
  CASE WHEN row_number() OVER (PARTITION BY t.person_id
                               ORDER BY t.created_at NULLS LAST, t.id) = 1
       THEN 'inicial' ELSE 'seguimiento' END,
  t.weight, t.body_fat, t.weight_muscle, t.water,
  t.arm, t.waist, t.abs, NULL, t.height,
  legacy_etl.safe_int(t.age),
  NULL,
  nullif(trim(t.a_evaluation),''),
  coalesce(t.created_at, now())
FROM legacy.person_tracking t
JOIN legacy.person p ON p.id = t.person_id AND p.role = 'patient';

-- ---------------------------------------------------------------------------
-- 5. Packages (all legacy products; record_status → active).
-- ---------------------------------------------------------------------------
\echo '== 5. packages =='
INSERT INTO public.package
  (id, display_label, code, price_per_day, consult_price, month_discount,
   couple_discount, especial_discount, includes_desayuno, includes_snack1,
   includes_comida, includes_snack2, includes_cena, active, created_at,
   updated_at)
SELECT
  legacy_etl.nid('package', pr.id::text),
  left(coalesce(nullif(trim(pr.display_label),''),'Paquete '||pr.id), 80),
  left(coalesce(nullif(trim(pr.code),''),'PQ-'||pr.id), 40),
  coalesce(pr.price_sell, 0),
  pr.medic_consult,
  coalesce(pr.month_discount, 0),
  coalesce(pr.couple_discount, 0),
  coalesce(pr.especial_discount, 0),
  coalesce(pr.breakfast, false),
  coalesce(pr.snack1, false),
  coalesce(pr.lunch, false),
  coalesce(pr.snack2, false),
  coalesce(pr.dinner, false),
  coalesce(pr.record_status, true),
  coalesce(pr.created_at, now()),
  coalesce(pr.updated_at, now())
FROM legacy.product pr;

-- ---------------------------------------------------------------------------
-- 6. Menús del día inside the window → menu_day + dishes.
--    Dish identity = (name, meal_time); when the same dish name appears on
--    several days, the most recent day's recipe wins. kcal-tier portions come
--    from the same menu row (calories_portions JSON).
-- ---------------------------------------------------------------------------
\echo '== 6. menu days, dishes, portions =='
CREATE TEMP TABLE _menus AS
SELECT DISTINCT ON (m.menu_day)
  m.id, m.menu_day, m.meals, m.calories_portions, m.created_at, m.updated_at
FROM legacy.main_menu m, _p
WHERE m.menu_day BETWEEN _p.win_start AND _p.win_end
ORDER BY m.menu_day, m.id DESC;

CREATE TEMP TABLE _menu_meals AS
SELECT
  m.id AS menu_id,
  m.menu_day,
  meal.value AS meal,
  lower(trim(coalesce(meal.value->>'type',''))) AS mtype,
  coalesce(nullif(trim(meal.value->>'name'),''),'') AS dish_name_raw
FROM _menus m,
     jsonb_array_elements(m.meals) WITH ORDINALITY meal(value, ord);

CREATE TEMP TABLE _dishes AS
SELECT DISTINCT ON (dish_key)
  legacy_etl.nid('dish', dish_key) AS dish_id,
  dish_key, dish_name_raw, meal_time, mtype, menu_id, menu_day, meal
FROM (
  SELECT mm.*,
    legacy_etl.meal_time(mm.mtype) AS meal_time,
    lower(trim(mm.dish_name_raw)) || '|' || legacy_etl.meal_time(mm.mtype) AS dish_key
  FROM _menu_meals mm
  WHERE mm.dish_name_raw <> '' AND legacy_etl.meal_time(mm.mtype) IS NOT NULL
) x
ORDER BY dish_key, menu_day DESC, menu_id DESC;

INSERT INTO public.dish (id, name, meal_time, usage_count, active, created_at, updated_at)
SELECT dish_id, left(dish_name_raw, 120), meal_time, 0, true, now(), now()
FROM _dishes;

CREATE TEMP TABLE _dish_ing AS
SELECT DISTINCT ON (d.dish_id, (i.value->>'id')::int)
  d.dish_id, d.dish_key,
  (i.value->>'id')::int AS ing_id,
  legacy_etl.safe_numeric(i.value->>'size') AS size,
  legacy_etl.norm_unit(i.value->>'unit') AS unit,
  coalesce(legacy_etl.safe_int(i.value->>'position'), i.ord::int) AS pos
FROM _dishes d,
     jsonb_array_elements(d.meal->'ingredients') WITH ORDINALITY i(value, ord)
WHERE (i.value->>'id') ~ '^[0-9]+$'
ORDER BY d.dish_id, (i.value->>'id')::int, pos;

INSERT INTO public.dish_ingredient
  (id, dish_id, ingredient_id, base_quantity, unit, position)
SELECT
  legacy_etl.nid('dishing', dish_key || '|' || ing_id),
  dish_id,
  legacy_etl.nid('ingredient', ing_id::text),
  coalesce(least(size, 99999), 0),
  unit,
  pos
FROM _dish_ing;

INSERT INTO public.dish_ingredient_portion
  (id, dish_ingredient_id, calorie_level_id, portions)
SELECT DISTINCT ON (di.dish_key, di.ing_id, cl.id)
  legacy_etl.nid('dip', di.dish_key || '|' || di.ing_id || '|' || cl.kcal),
  legacy_etl.nid('dishing', di.dish_key || '|' || di.ing_id),
  cl.id,
  coalesce(least(legacy_etl.safe_numeric(ti.value->>'portions'), 9999), 0)
FROM _dishes d
JOIN _menus m ON m.id = d.menu_id
CROSS JOIN LATERAL jsonb_array_elements(m.calories_portions) tier(value)
JOIN public.calorie_level cl
  ON (tier.value->>'kcal') ~ '^[0-9]{3,4}$'
 AND (tier.value->>'kcal')::int BETWEEN 800 AND 4000
 AND cl.kcal = (tier.value->>'kcal')::int
CROSS JOIN LATERAL jsonb_array_elements(tier.value->'meals') tmeal(value)
CROSS JOIN LATERAL jsonb_array_elements(tmeal.value->'ingredients') ti(value)
JOIN _dish_ing di
  ON di.dish_id = d.dish_id
 AND (ti.value->>'id') ~ '^[0-9]+$'
 AND di.ing_id = (ti.value->>'id')::int
WHERE lower(trim(coalesce(tmeal.value->>'type',''))) = d.mtype
ORDER BY di.dish_key, di.ing_id, cl.id
ON CONFLICT DO NOTHING;

INSERT INTO public.menu_day (id, menu_date, status, created_by_id, created_at, updated_at)
SELECT
  legacy_etl.nid('menuday', m.menu_day::text),
  m.menu_day, 'completo', NULL,
  coalesce(m.created_at, now()), coalesce(m.updated_at, now())
FROM _menus m;

INSERT INTO public.menu_day_meal (id, menu_day_id, meal_slot, dish_id, position)
SELECT DISTINCT ON (mm.menu_day, s.slot)
  legacy_etl.nid('mdm', mm.menu_day::text || '|' || s.slot),
  legacy_etl.nid('menuday', mm.menu_day::text),
  s.slot,
  d.dish_id,
  CASE s.slot
    WHEN 'desayuno' THEN 0 WHEN 'colacion1' THEN 1 WHEN 'comida' THEN 2
    WHEN 'colacion2' THEN 3 ELSE 4 END
FROM _menu_meals mm
CROSS JOIN LATERAL (SELECT legacy_etl.meal_slot(mm.mtype) AS slot) s
LEFT JOIN _dishes d
  ON d.dish_key = lower(trim(mm.dish_name_raw)) || '|' || legacy_etl.meal_time(mm.mtype)
WHERE s.slot IS NOT NULL
ORDER BY mm.menu_day, s.slot
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Sales in scope: any sale (not soft-deleted) created inside the window,
--    or with a delivery day or a payment due inside the window. All payments
--    and delivery days of an in-scope sale migrate with it.
--    billing: M→mensual, Q→quincenal, S→semanal, D/Dia→diario.
--    package: first sale_item's product, else the most frequent product on
--    the sale's delivery days (7.7k old sales have no sale_item rows).
-- ---------------------------------------------------------------------------
\echo '== 7. sales =='
CREATE TEMP TABLE _sales AS
SELECT s.*
FROM legacy.sale s, _p
WHERE s.record_status IS NOT FALSE
  AND (
    legacy_etl.mx_date(s.created_at) BETWEEN _p.win_start AND _p.win_end
    OR s.id IN (SELECT d.sale_id FROM legacy.daily_income d, _p pp
                WHERE d.income_day BETWEEN pp.win_start AND pp.win_end)
    OR s.id IN (SELECT y.sale_id FROM legacy.payment y, _p pp
                WHERE y.record_status IS NOT FALSE
                  AND y.end_date BETWEEN pp.win_start AND pp.win_end)
  );

INSERT INTO public.sale
  (id, folio, patient_id, package_id, type, total_amount, start_date, days,
   billing, discount, payment_type, invoice_requested, status, created_by_id,
   created_at, updated_at)
SELECT
  legacy_etl.nid('sale', s.id::text),
  'L-' || s.id,
  CASE WHEN pp.role = 'patient'
       THEN legacy_etl.nid('patient', s.person_id::text) END,
  CASE WHEN pkg.product_id IS NOT NULL
       THEN legacy_etl.nid('package', pkg.product_id::text) END,
  CASE WHEN lower(coalesce(s.type,'')) = 'consulta' THEN 'consulta' ELSE 'package' END,
  coalesce(s.total_amount, 0),
  coalesce(agg.min_day, legacy_etl.mx_date(s.created_at), current_date),
  coalesce(agg.n_days, 0),
  CASE upper(trim(coalesce(s.payment_type,'')))
    WHEN 'M' THEN 'mensual'
    WHEN 'Q' THEN 'quincenal'
    WHEN 'S' THEN 'semanal'
    ELSE 'diario'
  END,
  0, NULL,
  coalesce(s.invoice_requested, false),
  CASE WHEN EXISTS (SELECT 1 FROM legacy.payment y
                    WHERE y.sale_id = s.id AND y.record_status IS NOT FALSE
                      AND y.payment_status IS NOT TRUE)
       THEN 'pendiente' ELSE 'pagada' END,
  cb.uid,
  coalesce(s.created_at, now()),
  coalesce(s.updated_at, now())
FROM _sales s
LEFT JOIN legacy.person pp ON pp.id = s.person_id
LEFT JOIN LATERAL (
  SELECT min(d.income_day) AS min_day, count(*)::int AS n_days
  FROM legacy.daily_income d WHERE d.sale_id = s.id
) agg ON true
LEFT JOIN LATERAL (
  SELECT coalesce(
    (SELECT si.product_id FROM legacy.sale_item si
     WHERE si.sale_id = s.id ORDER BY si.created_at, si.product_id LIMIT 1),
    (SELECT mode() WITHIN GROUP (ORDER BY d.product_id)
     FROM legacy.daily_income d
     WHERE d.sale_id = s.id AND d.product_id IS NOT NULL)
  ) AS product_id
) pkg ON true
LEFT JOIN LATERAL (
  SELECT legacy_etl.nid('user', s.created_by_id::text) AS uid
  WHERE s.created_by_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM legacy."user" u WHERE u.id = s.created_by_id)
) cb ON true;

\echo '== 7b. sale items =='
INSERT INTO public.sale_item (id, sale_id, package_id, quantity, unit_price, sub_total)
SELECT
  legacy_etl.nid('saleitem', si.sale_id || '|' || si.product_id),
  legacy_etl.nid('sale', si.sale_id::text),
  legacy_etl.nid('package', si.product_id::text),
  coalesce(si.quantity, 1),
  coalesce(si.unit_price, 0),
  coalesce(si.sub_total, 0)
FROM legacy.sale_item si
JOIN _sales s ON s.id = si.sale_id;

\echo '== 7c. payments (installments) =='
CREATE TEMP TABLE _payments AS
SELECT y.* FROM legacy.payment y
JOIN _sales s ON s.id = y.sale_id
WHERE y.record_status IS NOT FALSE;

INSERT INTO public.payment
  (id, folio, sale_id, patient_id, due_date, amount, method, paid, paid_at,
   note, created_at, updated_at)
SELECT
  legacy_etl.nid('payment', y.id::text),
  'L-' || y.id,
  legacy_etl.nid('sale', y.sale_id::text),
  CASE WHEN pp.role = 'patient'
       THEN legacy_etl.nid('patient', y.person_id::text) END,
  coalesce(y.end_date, legacy_etl.mx_date(y.created_at), current_date),
  coalesce(y.amount, 0),
  NULL,
  coalesce(y.payment_status, false),
  CASE WHEN y.payment_status THEN y.updated_at END,
  NULL,
  coalesce(y.created_at, now()),
  coalesce(y.updated_at, now())
FROM _payments y
LEFT JOIN legacy.person pp ON pp.id = y.person_id;

-- ---------------------------------------------------------------------------
-- 8. Delivery days (all daily_income rows of in-scope sales) and, for rows
--    inside the window that carry a resolved menu JSON, the normalized
--    delivery meals + ingredients (avoidPreference→preference,
--    avoidSickness→disease).
-- ---------------------------------------------------------------------------
\echo '== 8. delivery days =='
CREATE TEMP TABLE _dailies AS
SELECT d.* FROM legacy.daily_income d
JOIN _sales s ON s.id = d.sale_id;

INSERT INTO public.delivery_day
  (id, patient_id, sale_id, payment_id, package_id, menu_day_id,
   delivery_date, amount, type, has_menu, authorized, status, created_at,
   updated_at)
SELECT
  legacy_etl.nid('daily', d.id::text),
  CASE WHEN pp.role = 'patient'
       THEN legacy_etl.nid('patient', d.person_id::text) END,
  legacy_etl.nid('sale', d.sale_id::text),
  CASE WHEN y.id IS NOT NULL
       THEN legacy_etl.nid('payment', d.payment_id::text) END,
  CASE WHEN d.product_id IS NOT NULL
       THEN legacy_etl.nid('package', d.product_id::text) END,
  md.id,
  d.income_day,
  coalesce(d.amount, 0),
  CASE WHEN lower(coalesce(d.type,'')) = 'consulta' THEN 'consulta' ELSE 'package' END,
  coalesce(d.has_menu, false),
  coalesce(d.authorized, false),
  NULL,
  coalesce(d.created_at, now()),
  coalesce(d.updated_at, now())
FROM _dailies d
LEFT JOIN legacy.person pp ON pp.id = d.person_id
LEFT JOIN _payments y ON y.id = d.payment_id
LEFT JOIN public.menu_day md ON md.menu_date = d.income_day;

\echo '== 8b. delivery meals (windowed, resolved menus) =='
CREATE TEMP TABLE _dmeals AS
SELECT DISTINCT ON (d.id, s.slot)
  d.id AS daily_id,
  meal.value AS meal,
  lower(trim(coalesce(meal.value->>'type',''))) AS mtype,
  s.slot,
  coalesce(nullif(trim(coalesce(meal.value->>'originalName',
                                meal.value->>'name')),''),'') AS dish_name_raw
FROM _dailies d
JOIN _p ON d.income_day BETWEEN _p.win_start AND _p.win_end
CROSS JOIN LATERAL jsonb_array_elements(d.menu) meal(value)
CROSS JOIN LATERAL (
  SELECT legacy_etl.meal_slot(lower(trim(coalesce(meal.value->>'type','')))) AS slot
) s
WHERE d.menu IS NOT NULL AND jsonb_typeof(d.menu) = 'array'
  AND s.slot IS NOT NULL
ORDER BY d.id, s.slot;

INSERT INTO public.delivery_meal
  (id, delivery_day_id, meal_slot, dish_id, included, created_at)
SELECT
  legacy_etl.nid('dmeal', dm.daily_id || '|' || dm.slot),
  legacy_etl.nid('daily', dm.daily_id::text),
  dm.slot,
  d.dish_id,
  true,
  now()
FROM _dmeals dm
LEFT JOIN _dishes d
  ON d.dish_key = lower(trim(dm.dish_name_raw)) || '|' || legacy_etl.meal_time(dm.mtype);

INSERT INTO public.delivery_meal_ingredient
  (id, delivery_meal_id, ingredient_id, portions, conflict_type,
   substituted_from_ingredient_id, eliminated, position)
SELECT DISTINCT ON (dm.daily_id, dm.slot, x.ing_id)
  legacy_etl.nid('dmi', dm.daily_id || '|' || dm.slot || '|' || x.ing_id),
  legacy_etl.nid('dmeal', dm.daily_id || '|' || dm.slot),
  legacy_etl.nid('ingredient', x.ing_id::text),
  coalesce(least(legacy_etl.safe_numeric(i.value->>'portions'), 9999), 0),
  CASE
    WHEN (i.value->>'avoidPreference') = 'true' THEN 'preference'
    WHEN (i.value->>'avoidSickness') = 'true' THEN 'disease'
  END,
  NULL,
  false,
  coalesce(legacy_etl.safe_int(i.value->>'position'), i.ord::int)
FROM _dmeals dm
CROSS JOIN LATERAL jsonb_array_elements(dm.meal->'ingredients')
  WITH ORDINALITY i(value, ord)
CROSS JOIN LATERAL (
  SELECT (i.value->>'id')::int AS ing_id
  WHERE (i.value->>'id') ~ '^[0-9]+$'
) x
ORDER BY dm.daily_id, dm.slot, x.ing_id;

-- ---------------------------------------------------------------------------
-- 9. Staff & finance: beneficiaries (expense_company catalog), employees
--    (persons with role admin/doctor/staff + latest salary; doctor→nutriologa,
--    admin→admin, staff→cocina — adjust positions in the app afterwards),
--    and expenses inside the window (last legacy expense: 2026-02-15, so this
--    can be 0 — the rule stays date-driven on purpose).
-- ---------------------------------------------------------------------------
\echo '== 9. beneficiaries =='
INSERT INTO public.beneficiary (id, name, created_at)
SELECT DISTINCT ON (lower(trim(name)))
  legacy_etl.nid('benef', lower(trim(name))),
  left(trim(name), 120),
  coalesce(created_at, now())
FROM legacy.expense_company
WHERE nullif(trim(name),'') IS NOT NULL
ORDER BY lower(trim(name)), id
ON CONFLICT DO NOTHING;

\echo '== 9b. employees =='
INSERT INTO public.employee
  (id, first_name, last_name, email, position, salary_quincenal,
   last_payment_date, user_id, active, created_at, updated_at)
SELECT
  legacy_etl.nid('employee', p.id::text),
  left(coalesce(nullif(trim(p.first_name),''),'(Sin nombre)'), 80),
  left(coalesce(nullif(trim(p.last_name),''),''), 80),
  left(coalesce(nullif(lower(trim(p.email)),''),
                'empleado-' || p.id || '@nabani.local'), 120),
  CASE p.role
    WHEN 'doctor' THEN 'nutriologa'
    WHEN 'admin' THEN 'admin'
    ELSE 'cocina'
  END,
  coalesce(sal.amount, 0),
  (SELECT max(e.expense_date) FROM legacy.expense e
   WHERE e.person_id = p.id AND e.type = 'Nomina'),
  u.uid,
  coalesce(p.record_status, false),
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
FROM legacy.person p
LEFT JOIN LATERAL (
  SELECT ss.amount FROM legacy.person_employee_salary ss
  WHERE ss.employee_id = p.id
  ORDER BY ss.updated_at DESC NULLS LAST, ss.id DESC
  LIMIT 1
) sal ON true
LEFT JOIN LATERAL (
  SELECT legacy_etl.nid('user', lu.id::text) AS uid
  FROM legacy."user" lu
  WHERE nullif(trim(p.email),'') IS NOT NULL
    AND (lower(lu.email) = lower(trim(p.email))
         OR lower(lu.username) = lower(trim(p.email)))
  ORDER BY lu.id
  LIMIT 1
) u ON true
WHERE p.role IN ('admin','doctor','staff','account');

\echo '== 9c. expenses (window) =='
INSERT INTO public.expense
  (id, folio, beneficiary_id, concept, total_amount, expense_date, type,
   employee_id, comments, created_by_id, created_at, updated_at)
SELECT
  legacy_etl.nid('expense', e.id::text),
  'L-' || e.id,
  b.id,
  left(coalesce(nullif(trim(e.concept),''),'(Sin concepto)'), 200),
  coalesce(e.total_amount, 0),
  e.expense_date,
  CASE lower(coalesce(e.type,''))
    WHEN 'fijo' THEN 'fijo'
    WHEN 'nomina' THEN 'nomina'
    ELSE 'variable'
  END,
  CASE WHEN ep.id IS NOT NULL
       THEN legacy_etl.nid('employee', e.person_id::text) END,
  nullif(trim(e.details),''),
  cb.uid,
  coalesce(e.created_at, now()),
  coalesce(e.updated_at, now())
FROM legacy.expense e
JOIN _p ON e.expense_date BETWEEN _p.win_start AND _p.win_end
LEFT JOIN public.beneficiary b
  ON nullif(trim(e.concept),'') IS NOT NULL
 AND b.id = legacy_etl.nid('benef', lower(trim(e.concept)))
LEFT JOIN legacy.person ep
  ON ep.id = e.person_id AND ep.role IN ('admin','doctor','staff','account')
LEFT JOIN LATERAL (
  SELECT legacy_etl.nid('user', e.created_by_id::text) AS uid
  WHERE e.created_by_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM legacy."user" u WHERE u.id = e.created_by_id)
) cb ON true
WHERE e.record_status IS NOT FALSE AND e.expense_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 10. Dish usage counters
-- ---------------------------------------------------------------------------
\echo '== 10. dish usage counts =='
UPDATE public.dish d
SET usage_count = x.c
FROM (
  SELECT dish_id, count(*)::int AS c
  FROM public.menu_day_meal
  WHERE dish_id IS NOT NULL
  GROUP BY 1
) x
WHERE x.dish_id = d.id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Result summary
-- ---------------------------------------------------------------------------
\echo ''
\echo '===== MIGRATED ROW COUNTS ====='
SELECT t.name AS table, t.n AS rows FROM (
  SELECT 'user' AS name, count(*) AS n FROM public."user" UNION ALL
  SELECT 'patient', count(*) FROM public.patient UNION ALL
  SELECT 'patient_address', count(*) FROM public.patient_address UNION ALL
  SELECT 'nutrition_plan', count(*) FROM public.nutrition_plan UNION ALL
  SELECT 'patient_disease', count(*) FROM public.patient_disease UNION ALL
  SELECT 'patient_preference', count(*) FROM public.patient_preference UNION ALL
  SELECT 'consultation', count(*) FROM public.consultation UNION ALL
  SELECT 'calorie_level', count(*) FROM public.calorie_level UNION ALL
  SELECT 'ingredient', count(*) FROM public.ingredient UNION ALL
  SELECT 'ingredient_disease', count(*) FROM public.ingredient_disease UNION ALL
  SELECT 'package', count(*) FROM public.package UNION ALL
  SELECT 'dish', count(*) FROM public.dish UNION ALL
  SELECT 'dish_ingredient', count(*) FROM public.dish_ingredient UNION ALL
  SELECT 'dish_ingredient_portion', count(*) FROM public.dish_ingredient_portion UNION ALL
  SELECT 'menu_day', count(*) FROM public.menu_day UNION ALL
  SELECT 'menu_day_meal', count(*) FROM public.menu_day_meal UNION ALL
  SELECT 'sale', count(*) FROM public.sale UNION ALL
  SELECT 'sale_item', count(*) FROM public.sale_item UNION ALL
  SELECT 'payment', count(*) FROM public.payment UNION ALL
  SELECT 'delivery_day', count(*) FROM public.delivery_day UNION ALL
  SELECT 'delivery_meal', count(*) FROM public.delivery_meal UNION ALL
  SELECT 'delivery_meal_ingredient', count(*) FROM public.delivery_meal_ingredient UNION ALL
  SELECT 'beneficiary', count(*) FROM public.beneficiary UNION ALL
  SELECT 'employee', count(*) FROM public.employee UNION ALL
  SELECT 'expense', count(*) FROM public.expense
) t;

ANALYZE;

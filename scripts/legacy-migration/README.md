# Legacy Nutrivera → Nabani data migration

Feeds a fresh Nabani database with the old Nutrivera data. Master data
(users, patients + clinical profile, ingredients, packages) migrates in
full; transactional data (sales → payments → delivery days, menús del día,
expenses) is limited to a **6-month window: `current_date ± 3 months`**,
evaluated on the day you run `02-etl.sql`.

## Contents

| file | purpose |
|---|---|
| `00-legacy-schema.sql` | scratch DDL for the legacy tables (schema `legacy`) |
| `01-load-legacy-dump.sh` | loads the legacy `pg_dump` into schema `legacy` |
| `02-etl.sql` | the transform (single transaction, idempotent) |
| `03-validate.sql` | post-migration integrity checks |

## Runbook (local or production cutover)

```bash
cd nabani-backend

# 0. Nabani schema + catalog seed (16 diseases, base calorie levels)
#    Boot once so sequelize.sync() creates the tables, or run the seed:
NODE_ENV=development npx tsx src/scripts/seed.ts

# 1. Load the legacy dump into schema `legacy` of the SAME database
DATABASE_URL=postgresql://postgres:<pass>@<host>:5432/nabani \
  ./scripts/legacy-migration/01-load-legacy-dump.sh /path/to/nutrivera.sql

# 2. Transform (window = run-date ± 3 months). Pass the bcrypt hash of the
#    temporary password every migrated user gets (generate one privately, e.g.
#    node -e "console.log(require('bcrypt').hashSync(process.argv[1], 10))" '<temp password>')
psql "$DATABASE_URL" -v temp_password_hash="'<bcrypt hash>'" -f scripts/legacy-migration/02-etl.sql

# 3. Validate
psql "$DATABASE_URL" -f scripts/legacy-migration/03-validate.sql

# 4. When satisfied, drop the scratch schemas
psql "$DATABASE_URL" -c 'DROP SCHEMA legacy CASCADE; DROP SCHEMA legacy_etl CASCADE;'
```

Re-running is safe: IDs are deterministic (uuid v5 of `<kind>:<legacy id>`),
so reloading + re-running the ETL on the same data upserts nothing twice.
For a clean re-run, `DROP DATABASE`/recreate, re-sync, reseed, reload, re-ETL.

## Passwords

Legacy password hashes were placeholders and cannot be migrated. **Every
migrated user logs in with the temporary password whose bcrypt hash you pass
as `temp_password_hash`** (never commit the password or hash) and must
change it immediately (Perfil → Cambiar contraseña). Communicate the
password only through a private channel.

## Traceability

Every migrated sale/payment/expense carries `folio = 'L-<legacy id>'`, and
all migrated rows have deterministic UUIDs derived from their legacy ids, so
any record can be traced back to the old system.

## Mapping decisions (summary)

- **person → patient / employee.** `role='patient'` → `patient` (all 1,137,
  active *and* inactive: legacy `record_status` → `status activo/inactivo`).
  `role in (admin, doctor, staff)` → `employee` (doctor→nutriologa,
  admin→admin, staff→cocina — review positions in the app). Legacy patient
  `number` and `program_know` are dropped (spec deprecates them).
- **users**: roles map admin→admin, nutriologo/doctor→nutriologa,
  staff→front_desk. `doctor_id` was never populated in legacy, so
  `patient.nutriologa_id` starts NULL.
- **person_calorie → nutrition_plan** (latest row per patient) and
  `patient.calorie_level_id`. Non-numeric/absurd tiers (blank, `12004`) → no
  level. New calorie levels created for legacy tiers 800–4000 kcal
  (1100, 1200, 1350, 1500, …) with `sort_order ≥ 100`.
- **person_disease (17 booleans) → patient_disease** against the seeded
  16-key catalog; the retired `fibras` flag plus free-text
  `especiales`/`otros` land in `patient.other_diseases`.
- **ingredient_preference → patient_preference** (deduped).
- **person_tracking → consultation** — the FULL history (≈1 per patient,
  clinical continuity is worth more than the window). First per patient =
  `inicial`, rest `seguimiento`; `weight_muscle→muscle`, `abs→abdomen`;
  legacy `back`/`high_waist`/`leg`/PA fields have no Nabani column and are
  dropped; `hip` stays NULL (legacy never measured it).
- **ingredient**: `group_name` → `food_group` (Queso→lacteo;
  Proteina/Preparado/Embutido/Carne/Semillas/blank→otros). `base_quantity`/
  `base_unit` = most frequent size/unit across all legacy master menus.
  6 menu-referenced ingredients missing from the catalog are created as
  `active=false` placeholders.
- **product → package** (all; `record_status→active`, `price_sell→
  price_per_day`, `medic_consult→consult_price`, meal booleans → includes_*).
- **main_menu (window) → menu_day (+ menu_day_meal) and the dish library.**
  Dish identity = (name, meal_time); the most recent day's recipe wins;
  kcal-tier portion matrices come from the same menu row. Migrated menu days
  are marked `completo`; `usage_count` = times a dish appears in menus.
- **sale scope**: sales (not soft-deleted) with any activity in the window —
  created in it, a delivery day in it, or a payment due in it. An in-scope
  sale brings **all** its payments and delivery days so the
  Sale → Payments → DeliveryDays money graph stays consistent (edges may
  spill slightly outside the window).
  `payment_type` M/Q/S/D(ía) → billing mensual/quincenal/semanal/diario.
  `status` = `pagada` when no unpaid installment remains, else `pendiente`.
  Sales without `sale_item` rows (old data) get their package from the most
  frequent product on their delivery days.
- **payment**: `end_date→due_date`, `payment_status→paid` (+`paid_at` from
  `updated_at`). Legacy never recorded the method → NULL. Soft-deleted
  (`record_status=false`) payments are not migrated.
- **daily_income → delivery_day** (all rows of in-scope sales). The resolved
  per-patient menu JSON of **windowed** rows is normalized into
  `delivery_meal` + `delivery_meal_ingredient` (`avoidPreference→preference`,
  `avoidSickness→disease` conflict flags). `status` starts NULL — legacy
  `record_status` semantics were unreliable; authorized/has_menu carry over.
- **expense (window)**: Fijo/Variable/Nomina → fijo/variable/nomina
  (NULL→variable); `details→comments`; Nomina rows link to the employee.
  All 320 `expense_company` rows become `beneficiary` (matched by concept
  name). NOTE: the newest legacy expense is 2026-02-15, so a run today
  migrates 0 expenses — the rule is date-driven on purpose.

## Known gaps / follow-ups

- Employee `position` for legacy `staff` defaults to `cocina` — fix real
  positions (front_desk/reparto) in the app.
- `delivery_meal.dish_id` links by dish name; per-patient customized meal
  names that never appeared in a master menu stay unlinked (dish_id NULL) —
  harmless, the ingredient rows are what production reads.
- Legacy `person_condition` (clinical goals) was empty in the dump — nothing
  to migrate.
- `sale.payment_mean`, `payment.type`, tax columns were never filled in
  legacy — nothing to carry.

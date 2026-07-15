#!/usr/bin/env bash
# Load the legacy Nutrivera pg_dump (data-only, INSERT format) into schema
# `legacy` of the Nabani database, so 02-etl.sql can transform it in-place.
#
# Usage:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/nabani \
#     ./01-load-legacy-dump.sh /path/to/nutrivera.sql
set -euo pipefail

DUMP="${1:?usage: 01-load-legacy-dump.sh <nutrivera.sql>}"
DB="${DATABASE_URL:?set DATABASE_URL, e.g. postgresql://postgres:pass@localhost:5432/nabani}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> creating legacy schema (drops any previous legacy schema)"
psql "$DB" -q -v ON_ERROR_STOP=1 \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' \
  -f "$DIR/00-legacy-schema.sql"

echo ">> loading dump (single transaction; a few minutes for large dumps)"
# - transaction_timeout: emitted by pg_dump 18, unknown to PostgreSQL <17
# - setval: the scratch tables have no sequences
# - public.-> legacy.: dump was taken from schema public
sed -e '/^SET transaction_timeout/d' \
    -e '/pg_catalog\.setval/d' \
    -e 's/^INSERT INTO public\./INSERT INTO legacy./' "$DUMP" \
  | psql "$DB" -q -v ON_ERROR_STOP=1 -1 -c 'SET synchronous_commit=off' -f -

echo ">> indexing legacy schema (keeps the ETL fast)"
psql "$DB" -q -v ON_ERROR_STOP=1 <<'SQL'
CREATE INDEX IF NOT EXISTS ix_leg_daily_sale ON legacy.daily_income(sale_id);
CREATE INDEX IF NOT EXISTS ix_leg_daily_day ON legacy.daily_income(income_day);
CREATE INDEX IF NOT EXISTS ix_leg_daily_person ON legacy.daily_income(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_payment_sale ON legacy.payment(sale_id);
CREATE INDEX IF NOT EXISTS ix_leg_payment_end ON legacy.payment(end_date);
CREATE INDEX IF NOT EXISTS ix_leg_saleitem_sale ON legacy.sale_item(sale_id);
CREATE INDEX IF NOT EXISTS ix_leg_address_person ON legacy.address(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_cal_person ON legacy.person_calorie(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_dis_person ON legacy.person_disease(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_track_person ON legacy.person_tracking(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_pref_person ON legacy.ingredient_preference(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_expense_person ON legacy.expense(person_id);
CREATE INDEX IF NOT EXISTS ix_leg_expense_date ON legacy.expense(expense_date);
CREATE INDEX IF NOT EXISTS ix_leg_salary_emp ON legacy.person_employee_salary(employee_id);
ANALYZE;
SQL

echo ">> loaded. row counts:"
psql "$DB" -c "
SELECT 'person' t, count(*) FROM legacy.person UNION ALL
SELECT 'sale', count(*) FROM legacy.sale UNION ALL
SELECT 'payment', count(*) FROM legacy.payment UNION ALL
SELECT 'daily_income', count(*) FROM legacy.daily_income UNION ALL
SELECT 'main_menu', count(*) FROM legacy.main_menu UNION ALL
SELECT 'ingredient', count(*) FROM legacy.ingredient UNION ALL
SELECT 'expense', count(*) FROM legacy.expense;"

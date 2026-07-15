-- Legacy Nutrivera schema (permissive types) — receives the data-only pg_dump
-- rewritten from `public.` to `legacy.`. No FKs/indexes here; added after load.
DROP SCHEMA IF EXISTS legacy CASCADE;
CREATE SCHEMA legacy;

CREATE TABLE legacy."user" (
  id integer PRIMARY KEY,
  username text,
  display_name text,
  hashed_password text,
  email text,
  roles jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.person (
  id integer PRIMARY KEY,
  number integer,
  first_name text,
  last_name text,
  cellphone text,
  email text,
  gender text,
  birthday date,
  week text,
  program_know text,
  tuppers boolean,
  zone text,
  role text,
  other_food text,
  record_status boolean,
  doctor_id integer,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.address (
  id integer PRIMARY KEY,
  street text,
  number_ext text,
  number_int text,
  neighborhood text,
  zip_code text,
  state text,
  city text,
  created_at timestamptz,
  updated_at timestamptz,
  branch_id integer,
  person_id integer
);

CREATE TABLE legacy.sale (
  id integer PRIMARY KEY,
  total_amount numeric,
  payment_type text,
  type text,
  tax_percent numeric,
  taxes_amount numeric,
  payment_mean text,
  invoice_requested boolean,
  record_status boolean,
  person_id integer,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.payment (
  id integer PRIMARY KEY,
  end_date date,
  amount numeric,
  type text,
  payment_status boolean,
  record_status boolean,
  person_id integer,
  sale_id integer,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.product (
  id integer PRIMARY KEY,
  display_label text,
  code text,
  description text,
  stock integer,
  price_buy numeric,
  price_sell numeric,
  couple_discount integer,
  month_discount integer,
  especial_discount integer,
  category text,
  medic_consult numeric,
  breakfast boolean,
  snack1 boolean,
  lunch boolean,
  snack2 boolean,
  dinner boolean,
  record_status boolean,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.daily_income (
  id integer PRIMARY KEY,
  income_day date,
  amount numeric,
  type text,
  has_menu boolean,
  authorized boolean,
  menu jsonb,
  record_status boolean,
  person_id integer,
  sale_id integer,
  payment_id integer,
  product_id integer,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.expense (
  id integer PRIMARY KEY,
  total_amount numeric,
  expense_date date,
  concept text,
  details text,
  type text,
  taxes_percent numeric,
  taxes_amount numeric,
  invoice_requested boolean,
  record_status boolean,
  person_id integer,
  created_by_id integer,
  updated_by_id integer,
  deleted_by_id integer,
  branch_id integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.expense_company (
  id integer PRIMARY KEY,
  name text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.ingredient (
  id integer PRIMARY KEY,
  name text,
  group_name text,
  hipertension boolean,
  diabetes boolean,
  colesterol boolean,
  trigliceridos boolean,
  colitis boolean,
  gastritis boolean,
  embarazo boolean,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.ingredient_preference (
  person_id integer,
  ingredient_id integer,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.main_menu (
  id integer PRIMARY KEY,
  name text,
  menu_day date,
  meals jsonb,
  calories_values jsonb,
  calories_portions jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.person_calorie (
  id integer PRIMARY KEY,
  name text,
  vegetable integer,
  fruit integer,
  cereal integer,
  milk integer,
  breakfast integer,
  lunch integer,
  dinner integer,
  oil integer,
  seed integer,
  comments text,
  created_at timestamptz,
  updated_at timestamptz,
  person_id integer
);

CREATE TABLE legacy.person_disease (
  id integer PRIMARY KEY,
  especiales text,
  diabetes boolean,
  arterosclerosis boolean,
  hipertension boolean,
  infartos boolean,
  tiroides boolean,
  embarazo boolean,
  lactante boolean,
  colesterolemia boolean,
  trigliceridos boolean,
  osteoporosis boolean,
  digestion boolean,
  gastritis boolean,
  colitis boolean,
  estrenimiento boolean,
  fibras boolean,
  hormonas boolean,
  hidratacion boolean,
  otros text,
  created_at timestamptz,
  updated_at timestamptz,
  person_id integer
);

CREATE TABLE legacy.person_employee_salary (
  id integer PRIMARY KEY,
  role text,
  amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  employee_id integer
);

CREATE TABLE legacy.person_tracking (
  id integer PRIMARY KEY,
  weight numeric,
  height numeric,
  age text,
  "ETA" numeric,
  "paBed" integer,
  pa_sedentary integer,
  pa_moderate integer,
  pa_intense integer,
  a_evaluation text,
  body_fat numeric,
  weight_fat numeric,
  water numeric,
  weight_muscle numeric,
  back numeric,
  arm numeric,
  high_waist numeric,
  abs numeric,
  waist numeric,
  leg numeric,
  metabolic_age integer,
  created_at timestamptz,
  updated_at timestamptz,
  person_id integer
);

CREATE TABLE legacy.sale_item (
  quantity integer,
  unit_price numeric,
  sub_total numeric,
  created_at timestamptz,
  updated_at timestamptz,
  sale_id integer,
  product_id integer
);

-- Empty-in-dump tables, created for completeness so the loader never errors
CREATE TABLE legacy.branch (
  id integer PRIMARY KEY,
  business_name text,
  commercial_name text,
  phone bigint,
  website text,
  email text,
  "RFC" text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE legacy.person_condition (
  id integer PRIMARY KEY,
  kg_lose numeric,
  min_weight numeric,
  max_weight numeric,
  fat_desired integer,
  fat_kg_desired numeric,
  difference integer,
  diets text,
  medicines text,
  exercise boolean,
  start_exer time,
  end_exer time,
  regular_food text,
  breakfast text,
  lunch text,
  dinner text,
  snacks text,
  drinks text,
  alergic text,
  portions integer,
  dinner_out integer,
  social integer,
  created_at timestamptz,
  updated_at timestamptz,
  person_id integer
);

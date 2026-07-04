-- =============================================================================
-- Migration: Normalize Categories
--
-- Prerequisites: Run sequelize-cli migrations first:
--   npx sequelize-cli db:migrate
--
-- This creates the subcategory table and adds category_id/subcategory_id
-- columns to expense_item. Then run THIS script to:
--   1. Populate subcategory rows from category.sub_subcategories JSON
--   2. Insert orphaned subcategories found only in expense_item
--   3. Fill expense_item.category_id from expense_item.category (string match)
--   4. Fill expense_item.subcategory_id from expense_item.sub_category (string match)
--   5. Verify data integrity
--   6. Drop old VARCHAR columns
--
-- Run: psql -h <host> -U <user> -d myexpenses -f normalize-categories.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- Step 1: Populate subcategory table from category.sub_subcategories JSON
-- =============================================================================
INSERT INTO subcategory (name, category_id, created_at, updated_at)
SELECT DISTINCT
  trim(sub.value::text, '"') AS name,
  c.id AS category_id,
  NOW(),
  NOW()
FROM category c,
  json_array_elements(c.sub_subcategories::json) AS sub
WHERE c.sub_subcategories IS NOT NULL
  AND trim(sub.value::text, '"') != ''
ON CONFLICT (name, category_id) DO NOTHING;

SELECT 'Step 1 done: Subcategories from JSON' AS status,
       COUNT(*) AS rows_inserted
FROM subcategory;

-- =============================================================================
-- Step 2: Insert orphaned subcategories (exist in expense_item but not in JSON)
-- =============================================================================
INSERT INTO subcategory (name, category_id, created_at, updated_at)
SELECT DISTINCT
  ei.sub_category,
  c.id,
  NOW(),
  NOW()
FROM expense_item ei
INNER JOIN category c ON ei.category = c.name
WHERE ei.sub_category IS NOT NULL
  AND ei.sub_category != ''
  AND NOT EXISTS (
    SELECT 1 FROM subcategory sc
    WHERE sc.name = ei.sub_category AND sc.category_id = c.id
  )
ON CONFLICT (name, category_id) DO NOTHING;

SELECT 'Step 2 done: Orphaned subcategories inserted' AS status;

-- =============================================================================
-- Step 3: Populate expense_item.category_id
-- =============================================================================
UPDATE expense_item ei
SET category_id = c.id
FROM category c
WHERE ei.category = c.name
  AND ei.category IS NOT NULL
  AND ei.category != ''
  AND ei.category_id IS NULL;

SELECT 'Step 3 done: category_id populated' AS status;

-- =============================================================================
-- Step 4: Populate expense_item.subcategory_id
-- =============================================================================
UPDATE expense_item ei
SET subcategory_id = sc.id
FROM subcategory sc
INNER JOIN category c ON sc.category_id = c.id
WHERE ei.category = c.name
  AND ei.sub_category = sc.name
  AND ei.sub_category IS NOT NULL
  AND ei.sub_category != ''
  AND ei.subcategory_id IS NULL;

SELECT 'Step 4 done: subcategory_id populated' AS status;

-- =============================================================================
-- Step 5: Verification
-- =============================================================================
SELECT '--- VERIFICATION ---' AS status;

-- Should be 1 (the one row with empty category)
SELECT 'expense_items with NULL category_id' AS check_name,
       COUNT(*) AS result,
       '(expected: 1)' AS note
FROM expense_item WHERE category_id IS NULL;

-- Should be 0
SELECT 'NULL subcategory_id but non-empty sub_category' AS check_name,
       COUNT(*) AS result,
       '(expected: 0)' AS note
FROM expense_item
WHERE subcategory_id IS NULL
  AND sub_category IS NOT NULL
  AND sub_category != '';

-- Should be ~15205
SELECT 'expense_items with category_id set' AS check_name,
       COUNT(*) AS result
FROM expense_item WHERE category_id IS NOT NULL;

-- Total subcategories created
SELECT 'Total subcategories' AS check_name,
       COUNT(*) AS result
FROM subcategory;

-- Subcategories per category
SELECT c.name AS category, COUNT(sc.id) AS subcategory_count
FROM category c
LEFT JOIN subcategory sc ON sc.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- =============================================================================
-- Step 6: Drop old columns (DESTRUCTIVE — only after verification passes)
-- =============================================================================
-- Uncomment the lines below AFTER verifying the output of Step 5.
-- Run verification first, then re-run with these uncommented.

-- ALTER TABLE expense_item DROP COLUMN IF EXISTS category;
-- ALTER TABLE expense_item DROP COLUMN IF EXISTS sub_category;
-- ALTER TABLE category DROP COLUMN IF EXISTS sub_subcategories;
-- ALTER TABLE article DROP COLUMN IF EXISTS category;
-- SELECT 'Step 6 done: Old columns dropped' AS status;

COMMIT;

/**
 * Heavy production/costing aggregations run as parameterized raw SQL
 * (db.sequelize.query with :replacements). All :start/:end are DATEONLY strings.
 *
 * Cost model: portions × ingredient.base_quantity gives the total measured amount
 * in the base unit (gr/ml/pzas). For gr/ml we divide by 1000 to reach kg/L and
 * multiply by last_price (priced per kg/L); pzas is priced per piece (no divide).
 */

/** Σ portions per ingredient over a date range (shopping list). */
export const shoppingListSql = `
  SELECT i.id            AS "ingredientId",
         i.name          AS "name",
         i.food_group    AS "foodGroup",
         i.base_unit     AS "baseUnit",
         i.base_quantity AS "baseQuantity",
         i.last_price    AS "lastPrice",
         COALESCE(SUM(dmi.portions), 0) AS "portions"
  FROM delivery_meal_ingredient dmi
  JOIN delivery_meal dm ON dm.id = dmi.delivery_meal_id
  JOIN delivery_day  dd ON dd.id = dm.delivery_day_id
  JOIN ingredient    i  ON i.id  = dmi.ingredient_id
  WHERE dd.delivery_date BETWEEN :start AND :end
    AND dd.type = 'package'
    AND dmi.eliminated = false
  GROUP BY i.id
  ORDER BY i.food_group, i.name;
`;

/** Cost + portions per dish over a range (cost-per-portion). */
export const costPerDishSql = `
  SELECT dm.dish_id AS "dishId",
         d.name      AS "dishName",
         COALESCE(SUM(dmi.portions), 0) AS "portions",
         COALESCE(SUM(
           dmi.portions * i.base_quantity * COALESCE(i.last_price, 0)
           / CASE WHEN i.base_unit = 'pzas' THEN 1 ELSE 1000 END
         ), 0) AS "totalCost"
  FROM delivery_meal dm
  JOIN delivery_day  dd  ON dd.id = dm.delivery_day_id
  JOIN delivery_meal_ingredient dmi ON dmi.delivery_meal_id = dm.id
  JOIN ingredient i ON i.id = dmi.ingredient_id
  LEFT JOIN dish   d ON d.id = dm.dish_id
  WHERE dd.delivery_date BETWEEN :start AND :end
    AND dd.type = 'package'
    AND dmi.eliminated = false
    AND dm.dish_id IS NOT NULL
  GROUP BY dm.dish_id, d.name
  ORDER BY "totalCost" DESC;
`;

/** Ingredient cost aggregated per package + delivery count (margin per package). */
export const marginPerPackageSql = `
  SELECT p.id            AS "packageId",
         p.code          AS "code",
         p.display_label AS "displayLabel",
         p.price_per_day AS "pricePerDay",
         COUNT(DISTINCT dd.id) AS "deliveries",
         COALESCE(SUM(
           dmi.portions * i.base_quantity * COALESCE(i.last_price, 0)
           / CASE WHEN i.base_unit = 'pzas' THEN 1 ELSE 1000 END
         ), 0) AS "totalCost"
  FROM delivery_day dd
  JOIN package p ON p.id = dd.package_id
  JOIN delivery_meal dm ON dm.delivery_day_id = dd.id
  JOIN delivery_meal_ingredient dmi ON dmi.delivery_meal_id = dm.id
  JOIN ingredient i ON i.id = dmi.ingredient_id
  WHERE dd.delivery_date BETWEEN :start AND :end
    AND dd.type = 'package'
    AND dmi.eliminated = false
  GROUP BY p.id, p.code, p.display_label, p.price_per_day
  ORDER BY p.display_label;
`;

/** Σ delivery income per day over a range. */
export const incomeByDaySql = `
  SELECT dd.delivery_date AS "date",
         COALESCE(SUM(dd.amount), 0) AS "income"
  FROM delivery_day dd
  WHERE dd.delivery_date BETWEEN :start AND :end
  GROUP BY dd.delivery_date;
`;

/** Σ expense per day over a range. */
export const expenseByDaySql = `
  SELECT e.expense_date AS "date",
         COALESCE(SUM(e.total_amount), 0) AS "expense"
  FROM expense e
  WHERE e.expense_date BETWEEN :start AND :end
  GROUP BY e.expense_date;
`;

/** Σ delivery income grouped by package. Range bounds optional (COALESCE). */
export const incomesByPackageSql = `
  SELECT p.id            AS "packageId",
         p.code          AS "code",
         p.display_label AS "displayLabel",
         COALESCE(SUM(dd.amount), 0) AS "total",
         COUNT(dd.id)    AS "deliveries"
  FROM delivery_day dd
  JOIN package p ON p.id = dd.package_id
  WHERE dd.delivery_date BETWEEN :start AND :end
  GROUP BY p.id, p.code, p.display_label
  ORDER BY "total" DESC;
`;

/** Σ expense grouped by type over a range. */
export const expensesByTypeSql = `
  SELECT e.type AS "type",
         COALESCE(SUM(e.total_amount), 0) AS "total",
         COUNT(e.id) AS "count"
  FROM expense e
  WHERE e.expense_date BETWEEN :start AND :end
  GROUP BY e.type
  ORDER BY "total" DESC;
`;

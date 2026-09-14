-- ------------------------------------------------------------
-- FEATURE FLOW - COMPANY RESULT AGGREGATION INTEGRITY
-- ------------------------------------------------------------
-- Verifies the three rules the revenue report rests on
-- (Reporting/CompanyResultEndpoints.Queries.cs):
--   1. the accepted totals equal the SUM over the quotes table itself,
--   2. the monthly figures add up to the yearly one, which is what breaks
--      first if the period classification ever drifts off CreatedAt,
--   3. no Sent quote can fall into both the pending and the expired row.
-- The report reads stored quote totals, so this is a data-level check.
-- Expected result: 0 rows.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ------------------------------------------------------------
WITH accepted AS (
    SELECT date_part('year', q."CreatedAt")::int AS quote_year,
           date_part('month', q."CreatedAt")::int AS quote_month,
           q."TotalNet",
           q."TotalGross"
    FROM quotes q
    WHERE q."Status" = 'Accepted'
),
yearly AS (
    SELECT quote_year,
           SUM("TotalNet") AS year_net,
           SUM("TotalGross") AS year_gross
    FROM accepted
    GROUP BY quote_year
),
monthly_rollup AS (
    SELECT quote_year,
           SUM(month_net) AS month_net_sum,
           SUM(month_gross) AS month_gross_sum
    FROM (
        SELECT quote_year,
               quote_month,
               SUM("TotalNet") AS month_net,
               SUM("TotalGross") AS month_gross
        FROM accepted
        GROUP BY quote_year, quote_month
    ) per_month
    GROUP BY quote_year
),
month_year_mismatch AS (
    SELECT y.quote_year,
           'FAIL: monthly accepted totals do not add up to the yearly total' AS aggregation_integrity
    FROM yearly y
    JOIN monthly_rollup m ON m.quote_year = y.quote_year
    WHERE y.year_net <> m.month_net_sum
       OR y.year_gross <> m.month_gross_sum
),
line_total_mismatch AS (
    SELECT date_part('year', q."CreatedAt")::int AS quote_year,
           'FAIL: accepted quote totals disagree with their line amounts' AS aggregation_integrity
    FROM quotes q
    LEFT JOIN quotelines l ON l."QuoteId" = q."Id"
    WHERE q."Status" = 'Accepted'
    GROUP BY q."Id", q."CreatedAt", q."TotalNet", q."TotalGross"
    HAVING COALESCE(SUM(l."NetAmount"), 0) <> q."TotalNet"
        OR COALESCE(SUM(l."GrossAmount"), 0) <> q."TotalGross"
),
pending_expired_overlap AS (
    SELECT date_part('year', q."CreatedAt")::int AS quote_year,
           'FAIL: a sent quote landed in both the pending and the expired row' AS aggregation_integrity
    FROM quotes q
    WHERE q."Status" = 'Sent'
      AND q."ValidUntil" >= now() AT TIME ZONE 'UTC'
      AND q."ValidUntil" < now() AT TIME ZONE 'UTC'
)
SELECT * FROM month_year_mismatch
UNION ALL
SELECT * FROM line_total_mismatch
UNION ALL
SELECT * FROM pending_expired_overlap
ORDER BY quote_year;

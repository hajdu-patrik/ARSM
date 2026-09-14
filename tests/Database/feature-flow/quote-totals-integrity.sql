-- ------------------------------------------------------------
-- FEATURE FLOW - QUOTE TOTALS INTEGRITY
-- ------------------------------------------------------------
-- Verifies every persisted quote's stored totals agree with its lines and
-- with each other, guarding the invariant that Quote.cs/QuoteLine.cs and
-- Pricing/QuoteTotalsCalculator keep in sync on every save, and that
-- CK_Quotes_Totals enforces at the database level.
-- Expected result: 0 rows from both queries below.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 27. QUOTE NET TOTAL VS. LINE SUM
--     quotes.TotalNet must equal the sum of its quotelines.NetAmount
--     (0 for a quote with no lines). A stale TotalNet left behind by a
--     line insert/update/delete that skipped QuoteTotalsCalculator shows
--     up here.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."TotalNet",
       COALESCE(SUM(l."NetAmount"), 0) AS line_net_sum
FROM quotes q
LEFT JOIN quotelines l ON l."QuoteId" = q."Id"
GROUP BY q."Id", q."QuoteNumber", q."TotalNet"
HAVING q."TotalNet" <> COALESCE(SUM(l."NetAmount"), 0)
ORDER BY q."Id";


-- ------------------------------------------------------------
-- 28. QUOTE GROSS TOTAL VS. NET + VAT
--     quotes.TotalGross must equal TotalNet + TotalVat. Enforced by
--     CK_Quotes_Totals at the database level (see
--     core-schema/quote-schema-contracts.sql, section 24); this query
--     re-checks the same rule directly against the persisted rows.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."TotalGross",
       q."TotalNet" + q."TotalVat" AS net_plus_vat
FROM quotes q
WHERE q."TotalGross" <> q."TotalNet" + q."TotalVat"
ORDER BY q."Id";

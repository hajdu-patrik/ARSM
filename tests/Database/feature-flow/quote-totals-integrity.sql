-- FEATURE FLOW - QUOTE TOTALS INTEGRITY — stored totals must agree with lines and with each other
--     (root CLAUDE.md: gross = net + vat, never a rate multiply; CK_Quotes_Totals). Expected: 0 rows from both queries.

-- 27. QUOTE NET TOTAL VS. LINE SUM — TotalNet must equal SUM(quotelines.NetAmount), 0 with no lines.
--     Catches a stale TotalNet left by a save that skipped QuoteTotalsCalculator. Expected: 0 rows.
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."TotalNet",
       COALESCE(SUM(l."NetAmount"), 0) AS line_net_sum
FROM quotes q
LEFT JOIN quotelines l ON l."QuoteId" = q."Id"
GROUP BY q."Id", q."QuoteNumber", q."TotalNet"
HAVING q."TotalNet" <> COALESCE(SUM(l."NetAmount"), 0)
ORDER BY q."Id";


-- 28. QUOTE GROSS TOTAL VS. NET + VAT — TotalGross must equal TotalNet + TotalVat, already enforced
--     by CK_Quotes_Totals (quote-schema-contracts.sql #24); this re-checks it against live rows. Expected: 0 rows.
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."TotalGross",
       q."TotalNet" + q."TotalVat" AS net_plus_vat
FROM quotes q
WHERE q."TotalGross" <> q."TotalNet" + q."TotalVat"
ORDER BY q."Id";

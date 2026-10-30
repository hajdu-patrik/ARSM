-- AutoService DB - quote money math: line amounts, stored totals and the 200-line cap (root CLAUDE.md Core Invariants).
-- Assertion idiom: a violation makes the closing cast fail; gross is net + vat, never a rate multiplication.

-- 1. Each line follows QuoteLineCalculator: net = round(quantity * unit price, 2), vat = round(net * rate / 100, 2),
--    gross = net + vat (PostgreSQL round() on numeric rounds half away from zero, like MoneyRounding).
SELECT 'quote_line_amounts' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_line_amounts: ', COUNT(*), ' line(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT l."Id"::text AS detail
    FROM quotelines l
    WHERE l."NetAmount" <> round(l."Quantity" * l."NetUnitPrice", 2)
       OR l."VatAmount" <> round(l."NetAmount" * l."VatRatePercent" / 100, 2)
       OR l."GrossAmount" <> l."NetAmount" + l."VatAmount"
) v;


-- 2. Stored quote totals equal the sums of their lines (0 with no lines): TotalNet, TotalVat and TotalGross.
--    Catches a save that skipped QuoteTotalsCalculator; CK_Quotes_Totals only ties gross to net + vat.
SELECT 'quote_totals_match_lines' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_totals_match_lines: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text || ' ' || q."QuoteNumber" AS detail
    FROM quotes q
    LEFT JOIN quotelines l ON l."QuoteId" = q."Id"
    GROUP BY q."Id", q."QuoteNumber", q."TotalNet", q."TotalVat", q."TotalGross"
    HAVING q."TotalNet" <> COALESCE(SUM(l."NetAmount"), 0)
        OR q."TotalVat" <> COALESCE(SUM(l."VatAmount"), 0)
        OR q."TotalGross" <> COALESCE(SUM(l."GrossAmount"), 0)
) v;


-- 3. A quote holds at most 200 lines (QuoteValidation.MaxLineCount, a handler cap no CHECK can express).
SELECT 'quote_line_cap' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_line_cap: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT l."QuoteId"::text || ' has ' || COUNT(*) || ' lines' AS detail
    FROM quotelines l
    GROUP BY l."QuoteId"
    HAVING COUNT(*) > 200
) v;


-- 4. A line description is stored trimmed and non-blank (the resolved snapshot is trimmed, or the catalog name).
SELECT 'quote_line_description_trimmed' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_line_description_trimmed: ', COUNT(*), ' line(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT l."Id"::text AS detail
    FROM quotelines l
    WHERE btrim(l."Description") = ''
       OR l."Description" <> btrim(l."Description")
) v;

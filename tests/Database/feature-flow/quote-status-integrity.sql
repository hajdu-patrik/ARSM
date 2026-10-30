-- AutoService DB - quote status lifecycle: stored values and the SentAt/DecidedAt stamps (ApplyQuoteStatusTransition).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Status is one of the four QuoteStatus names; Expired is a computed DTO flag and is never stored.
SELECT 'quote_status_values' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_status_values: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text || ' ' || q."Status" AS detail
    FROM quotes q
    WHERE q."Status" NOT IN ('Draft', 'Sent', 'Accepted', 'Rejected')
) v;


-- 2. The stamps follow the status: Draft has neither, Sent has SentAt only, Accepted/Rejected have both.
SELECT 'quote_status_stamps' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_status_stamps: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text || ' ' || q."Status" AS detail
    FROM quotes q
    WHERE (q."Status" = 'Draft' AND (q."SentAt" IS NOT NULL OR q."DecidedAt" IS NOT NULL))
       OR (q."Status" = 'Sent' AND (q."SentAt" IS NULL OR q."DecidedAt" IS NOT NULL))
       OR (q."Status" IN ('Accepted', 'Rejected') AND (q."SentAt" IS NULL OR q."DecidedAt" IS NULL))
) v;


-- 3. The stamps are in lifecycle order: created, then sent, then decided.
SELECT 'quote_stamp_order' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_stamp_order: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text AS detail
    FROM quotes q
    WHERE (q."SentAt" IS NOT NULL AND q."SentAt" < q."CreatedAt")
       OR (q."DecidedAt" IS NOT NULL AND q."SentAt" IS NOT NULL AND q."DecidedAt" < q."SentAt")
) v;


-- 4. A Sent, Accepted or Rejected quote has at least one line: Draft -> Sent requires one, and a Sent quote is
--    read-only, so its lines can no longer be removed.
SELECT 'sent_quote_has_lines' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL sent_quote_has_lines: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text || ' ' || q."Status" AS detail
    FROM quotes q
    WHERE q."Status" <> 'Draft'
      AND NOT EXISTS (SELECT 1 FROM quotelines l WHERE l."QuoteId" = q."Id")
) v;

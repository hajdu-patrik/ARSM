-- ------------------------------------------------------------
-- FEATURE FLOW - QUOTE STATUS LIFECYCLE INTEGRITY
-- ------------------------------------------------------------
-- Verifies every quote whose Status has advanced past Sent (Accepted or
-- Rejected, Domain/UniqueTypes/QuoteStatus.cs) has already recorded a
-- SentAt timestamp: a quote cannot be decided before it was sent.
-- SentAt/DecidedAt are set by the Quotes handlers, not by a database
-- constraint, so this is a data-level check, not a schema one.
-- Expected result: 0 rows.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ------------------------------------------------------------
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."Status",
       q."SentAt",
       q."DecidedAt",
       CASE
           WHEN q."Status" IN ('Accepted', 'Rejected') AND q."SentAt" IS NULL THEN 'FAIL: decided quote missing SentAt'
           ELSE 'OK'
       END AS status_lifecycle_integrity
FROM quotes q
WHERE q."Status" IN ('Accepted', 'Rejected')
  AND q."SentAt" IS NULL
ORDER BY q."Id";
